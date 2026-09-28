// Next.js' native sitemap convention (app/sitemap.js) — auto-served at
// /sitemap.xml, no separate file to hand-maintain. Lists every public
// marketing/SEO page in both locales; the app itself (/app, /account)
// and auth pages are intentionally excluded (nothing there is meant to
// be indexed). English is the unprefixed default locale (see
// src/i18n/routing.js), German lives under /de.
const SITE_URL = "https://orblit.io";

const PATHS = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/zotero-citation-map", priority: 0.7, changeFrequency: "monthly" },
  { path: "/compare", priority: 0.6, changeFrequency: "monthly" },
  { path: "/compare/litmaps-alternative", priority: 0.7, changeFrequency: "monthly" },
  { path: "/compare/researchrabbit-alternative", priority: 0.7, changeFrequency: "monthly" },
  { path: "/compare/connected-papers-alternative", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap() {
  const now = new Date();
  return PATHS.flatMap(({ path, priority, changeFrequency }) => [
    {
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: {
        languages: {
          en: `${SITE_URL}${path}`,
          de: `${SITE_URL}/de${path}`,
          "x-default": `${SITE_URL}${path}`,
        },
      },
    },
    {
      url: `${SITE_URL}/de${path}`,
      lastModified: now,
      changeFrequency,
      priority: priority - 0.1,
      alternates: {
        languages: {
          en: `${SITE_URL}${path}`,
          de: `${SITE_URL}/de${path}`,
          "x-default": `${SITE_URL}${path}`,
        },
      },
    },
  ]);
}
