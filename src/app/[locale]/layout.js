import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

export const metadata = {
  // Lets per-page metadata (openGraph.images, twitter images, etc.) use
  // relative paths like "/screenshots/map_example.png" and still resolve
  // to a correct absolute URL — without this Next.js falls back to
  // http://localhost:3000 as the base, which breaks OG previews in prod.
  metadataBase: new URL("https://orblit.io"),
  title: "OrbLit - Citation Explorer",
  description:
    "Search OpenAlex, visualize citation networks, and sync with your Zotero library.",
  applicationName: "OrbLit",
  openGraph: {
    siteName: "OrbLit",
    title: "OrbLit",
    description:
      "Search OpenAlex, visualize citation networks, and sync with your Zotero library.",
    url: "https://orblit.io",
    type: "website",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// This is the app's true root layout (defines <html>/<body>) even though
// it lives under app/[locale]/ — app/ has no page.js of its own, and the
// non-locale routes (app/api/*, app/auth/confirm, app/logout) are Route
// Handlers that don't render a layout at all, so there's no separate
// app/layout.js.
export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body style={{ margin: 0 }}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
