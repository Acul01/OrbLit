import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { fetchZoteroCollections } from "@/lib/zotero-client";

// GET: connection status only — never returns the key.
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
    .from("zotero_credentials")
    .select("zotero_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: !!data,
    zoteroUserId: data?.zotero_user_id || "",
  });
}

// POST: validate the credentials against the real Zotero API (also gets us
// the collection list "for free"), then encrypt + store the key. The
// plaintext key exists only for the duration of this request.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { zoteroUserId, zoteroApiKey } = await request.json().catch(() => ({}));
  if (!zoteroUserId?.trim() || !zoteroApiKey?.trim()) {
    return NextResponse.json(
      { error: "User ID and API key are required" },
      { status: 400 }
    );
  }

  let collections;
  try {
    collections = await fetchZoteroCollections(
      zoteroUserId.trim(),
      zoteroApiKey.trim()
    );
  } catch {
    return NextResponse.json(
      { error: "Connection failed. Check User ID and API key." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("zotero_credentials").upsert(
    {
      user_id: user.id,
      zotero_user_id: zoteroUserId.trim(),
      encrypted_api_key: encrypt(zoteroApiKey.trim()),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }

  return NextResponse.json({ collections });
}

// DELETE: disconnect Zotero (removes the stored key).
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin.from("zotero_credentials").delete().eq("user_id", user.id);
  return NextResponse.json({ disconnected: true });
}
