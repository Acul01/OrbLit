import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

// Auth guard only. proxy.js already redirects unauthenticated requests
// before they get here (cheap cookie check); this is the authoritative
// server-side check.
export default async function AppLayout({ children }) {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login?next=/app", locale });
  }

  return children;
}
