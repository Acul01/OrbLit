import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Next.js 16 renamed middleware.js -> proxy.js (same runtime, new file/
// export name). This runs on every matched request and does two things:
//   1. next-intl locale negotiation/rewriting (createIntlMiddleware).
//   2. Supabase session refresh + redirect unauthenticated users away
//      from protected app routes (the authoritative auth check is one
//      layer deeper, in app/[locale]/app/layout.js).
const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PREFIXES = ["/app", "/account"];

/** Strips a leading locale segment (e.g. "/de/app" -> "/app") so route
 *  protection checks are locale-agnostic. Only non-default locales are
 *  ever prefixed under localePrefix: "as-needed". */
function stripLocale(pathname) {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export async function proxy(request) {
  const intlResponse = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            intlResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = stripLocale(request.nextUrl.pathname);
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const locale = request.nextUrl.pathname.split("/")[1];
    const isNonDefaultLocale = routing.locales.includes(locale) && locale !== routing.defaultLocale;
    const loginPath = isNonDefaultLocale ? `/${locale}/login` : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|sitemap.xml|robots.txt|api|auth|logout|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov)$).*)",
  ],
};
