import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware wrappers for next/link, next/navigation — use these instead
// of the plain Next.js versions anywhere inside app/[locale]/* so links and
// redirects stay on the current locale automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
