import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "de"],
  defaultLocale: "en",
  // "as-needed": the default locale (en) has no URL prefix (/, /login),
  // German lives under /de (/de, /de/login) — keeps existing English URLs
  // stable for anyone who already bookmarked/shared them pre-i18n.
  localePrefix: "as-needed",
  // Visiting "/" always renders English, regardless of the browser's
  // Accept-Language header or a previously-set NEXT_LOCALE cookie — no
  // auto-redirect to /de. German is only ever reached by explicitly
  // navigating to /de or using the locale toggle.
  localeDetection: false,
});
