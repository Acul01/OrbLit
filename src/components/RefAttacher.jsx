"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { consumeStoredRef } from "@/lib/refTracking";

// Invisible — runs once when the (now-authenticated) user reaches /app.
// If a lead-source ref was captured on the landing page and the user
// doesn't already have one attributed, writes it into their Supabase
// user_metadata. Works for both email/password and Google signups since
// it fires after auth succeeds either way, not at signup time.
export default function RefAttacher() {
  useEffect(() => {
    (async () => {
      const ref = consumeStoredRef();
      if (!ref) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.user_metadata?.ref) return;
      await supabase.auth.updateUser({ data: { ref } });
    })();
  }, []);

  return null;
}
