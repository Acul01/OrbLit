import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: connection status only — never returns tokens.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("mendeley_credentials")
    .select("mendeley_profile_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: !!data,
    profileId: data?.mendeley_profile_id || "",
  });
}

// DELETE: disconnect Mendeley (removes the stored tokens).
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin.from("mendeley_credentials").delete().eq("user_id", user.id);
  return NextResponse.json({ disconnected: true });
}
