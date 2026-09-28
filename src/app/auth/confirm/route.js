import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the link from Supabase's signup-confirmation email
// (?token_hash=...&type=signup). Verifies the OTP, establishes a session
// via cookies, then sends the user into the app.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/app";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=confirmation_failed`
  );
}
