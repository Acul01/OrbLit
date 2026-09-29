import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";

// OAuth callback (Google and GitHub):
// Supabase redirects here with ?code=... after the provider round-trip;
// exchangeCodeForSession turns that into a session + cookies. Distinct
// from app/auth/confirm/route.js, which handles the email-link
// (token_hash + type) flow for plain email/password signup.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
