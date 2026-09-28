import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS entirely. Import this ONLY
// from server-only code that must write rows on behalf of the system
// rather than the signed-in user: cluster embeddings and the Zotero
// credential routes (zotero_credentials). Never expose this to
// a Client Component or send SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
