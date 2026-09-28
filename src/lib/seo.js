// Shared metadata builder for the SEO landing pages (/compare/*,
// /zotero-citation-map) — canonical + hreflang alternates + OpenGraph +
// Twitter card, all pointing at the right locale-prefixed URL (English
// is the unprefixed default locale, German lives under /de — see
// src/i18n/routing.js).
const SITE_URL = "https://orblit.io";
export const GITHUB_URL = "https://github.com/Acul01/OrbLit";
const OG_IMAGE = "/screenshots/map_example.png";

/** `path` is locale-agnostic, e.g. "/compare/litmaps-alternative". */
export function buildPageMetadata({ locale, path, title, description }) {
  const localizedPath = locale === "en" ? path : `/${locale}${path}`;
  const url = `${SITE_URL}${localizedPath}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}${path}`,
        de: `${SITE_URL}/de${path}`,
        // Fallback for any language/region not explicitly listed above —
        // points at the English version, same as this site's own
        // un-prefixed default locale (see src/i18n/routing.js).
        "x-default": `${SITE_URL}${path}`,
      },
    },
    openGraph: {
      siteName: "OrbLit",
      title,
      description,
      url,
      type: "website",
      images: [{ url: OG_IMAGE, width: 1705, height: 903 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}
