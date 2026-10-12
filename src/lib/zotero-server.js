import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { isLocalMode } from "@/lib/mode";
import { readLocalZotero } from "@/lib/local-store";

// Loads and decrypts the signed-in user's Zotero credentials. Server-only
// (uses the service-role client, which is the only client allowed to read
// zotero_credentials.encrypted_api_key — see supabase/migrations/0001_init.sql).
// Returns null if the user hasn't connected Zotero yet.
// Ciphertexts from before user-id binding are rewritten on read.
// A local run reads ZOTERO_USER_ID / ZOTERO_API_KEY or data/zotero.json.
export async function getZoteroCredentials(userId) {
  if (isLocalMode()) return readLocalZotero();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("zotero_credentials")
    .select("zotero_user_id, encrypted_api_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const { plaintext, legacy } = decrypt(data.encrypted_api_key, userId);
  if (legacy) {
    await admin
      .from("zotero_credentials")
      .update({ encrypted_api_key: encrypt(plaintext, userId) })
      .eq("user_id", userId);
  }

  return {
    zoteroUserId: data.zotero_user_id,
    apiKey: plaintext,
  };
}
