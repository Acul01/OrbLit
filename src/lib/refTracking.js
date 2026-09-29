import { createClient } from "@/lib/supabase/client";

// Lightweight lead-source tracking: a `?ref=` query param on a shared link
// (e.g. orblit.io/?ref=zotero-forum) gets captured into sessionStorage on
// the landing page, then attached to the user's Supabase metadata once
// they're actually authenticated in /app — covers both email/password and
// Google signups without touching the signup form itself. sessionStorage
// (not a persistent cookie) survives the redirect through sign-up and back,
// but doesn't need cookie-consent handling since it's first-party
// and tab-scoped, not a tracking cookie.
//
// A raw click count (independent of whether the visit ever converts to a
// signup) is logged separately into the `link_clicks` table, once per ref
// per session — gated on the same "is this a new ref for this session"
// check as the sessionStorage write, so page refreshes don't inflate it.
const REF_KEY = "orblit_ref";
const REF_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function captureRefFromUrl(searchParams) {
  if (typeof window === "undefined") return;
  const ref = searchParams.get("ref");
  if (!ref || !REF_PATTERN.test(ref)) return;
  if (sessionStorage.getItem(REF_KEY) === ref) return;
  sessionStorage.setItem(REF_KEY, ref);
  logClick(ref);
}

export function consumeStoredRef() {
  if (typeof window === "undefined") return null;
  const ref = sessionStorage.getItem(REF_KEY);
  if (ref) sessionStorage.removeItem(REF_KEY);
  return ref;
}

async function logClick(ref) {
  try {
    const supabase = createClient();
    await supabase.from("link_clicks").insert({ ref });
  } catch {
    // Best-effort — a failed click log should never break the page.
  }
}
