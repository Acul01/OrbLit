import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Deletes the signed-in auth user. profiles, projects, feedback,
// zotero_credentials (0001_init.sql), and mendeley_credentials
// (0009_mendeley_credentials.sql) cascade from auth.users.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }

  await supabase.auth.signOut({ scope: "global" });
  return NextResponse.json({ deleted: true });
}
