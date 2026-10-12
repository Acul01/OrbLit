import { isLocalMode } from "@/lib/mode";
import { createClient } from "@/lib/supabase/server";

// Hosted requests resolve the Supabase session. A local run has a single
// user and no session.
export async function getRequestUser() {
  if (isLocalMode()) return { id: "local" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
