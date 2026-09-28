import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import OrbitHero from "@/components/OrbitHero";
import FeatureSlider from "@/components/FeatureSlider";
import RefCapture from "@/components/RefCapture";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { GITHUB_URL } from "@/lib/seo";

// Homepage title is just "OrbLit" (no subtitle) so it matches the app name
// configured on the Google OAuth consent screen exactly — Google's app
// verification review checks that the two agree.
export const metadata = {
  title: "OrbLit",
  description:
    "Search OpenAlex, visualize citation networks, and sync with your Zotero library.",
  openGraph: {
    siteName: "OrbLit",
    title: "OrbLit",
    description:
      "Search OpenAlex, visualize citation networks, and sync with your Zotero library.",
    url: "https://orblit.io",
    type: "website",
  },
};

export default async function Home() {
  const t = await getTranslations("landing");

  return (
    <div style={s.page}>
      <Suspense fallback={null}>
        <RefCapture />
      </Suspense>
      <MarketingHeader />

      <section style={s.hero}>
        <div style={s.heroOrbit}>
          <OrbitHero />
        </div>
        <div style={s.heroCopy}>
          <h1 style={s.heroTitle}>{t("hero.title")}</h1>
          <p style={s.heroTagline}>{t("hero.tagline")}</p>
          <div style={s.heroCtas}>
            <Link href="/signup" style={s.ctaPrimary}>
              {t("hero.ctaPrimary")}
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={s.ctaSecondary}>
              {t("hero.ctaSecondary")}
            </a>
          </div>
        </div>
      </section>

      <section style={s.features}>
        <h2 style={s.sectionTitle}>{t("features.title")}</h2>
        <div style={s.featureGrid}>
          {["search", "map", "zotero", "tags"].map((key) => (
            <div key={key} style={s.featureCard}>
              <h3 style={s.featureCardTitle}>{t(`features.${key}.title`)}</h3>
              <p style={s.featureCardBody}>{t(`features.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={s.screenshots}>
        <h2 style={s.sectionTitle}>{t("showcase.sectionTitle")}</h2>
        <FeatureSlider
          slides={[
            {
              video: "/clips/network-map.mp4",
              alt: t("showcase.map.title"),
              title: t("showcase.map.title"),
              caption: t("showcase.map.body"),
              width: 1916,
              height: 988,
            },
            {
              video: "/clips/list-view.mp4",
              alt: t("showcase.list.title"),
              title: t("showcase.list.title"),
              caption: t("showcase.list.body"),
              width: 1916,
              height: 988,
            },
            {
              video: "/clips/themes-map.mp4",
              alt: t("showcase.themes.title"),
              title: t("showcase.themes.title"),
              caption: t("showcase.themes.body"),
              width: 1916,
              height: 988,
            },
            {
              video: "/clips/themes-map_with_suggestions.mp4",
              alt: t("showcase.suggestions.title"),
              title: t("showcase.suggestions.title"),
              caption: t("showcase.suggestions.body"),
              width: 1916,
              height: 988,
            },
            {
              video: "/clips/zotero-sync.mp4",
              alt: t("showcase.zotero.title"),
              title: t("showcase.zotero.title"),
              caption: t("showcase.zotero.body"),
              width: 1916,
              height: 988,
            },
          ]}
        />
      </section>

      <MarketingFooter />
    </div>
  );
}

const s = {
  page: {
    background: "#0B1220",
    color: "#E8E6DE",
    fontFamily: "system-ui, sans-serif",
    minHeight: "100vh",
    overflowX: "hidden",
  },
  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
    padding: "48px 24px 72px",
    maxWidth: 1180,
    margin: "0 auto",
    flexWrap: "wrap",
  },
  heroOrbit: { flex: "1 1 380px", display: "flex", justifyContent: "center", minWidth: 0 },
  heroCopy: {
    flex: "1 1 420px",
    minWidth: 280,
    maxWidth: 560,
    textAlign: "left",
  },
  heroTitle: {
    fontSize: "clamp(32px, 4.2vw, 48px)",
    lineHeight: 1.1,
    margin: "8px 0 16px",
  },
  heroTagline: {
    color: "#B9C2D0",
    fontSize: 17,
    lineHeight: 1.6,
    margin: "0 0 28px",
  },
  heroCtas: { display: "flex", gap: 14, flexWrap: "wrap" },
  ctaPrimary: {
    background: "#4FD1C5",
    color: "#0B1220",
    padding: "12px 22px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 15,
  },
  ctaSecondary: {
    border: "1px solid #2A3B5C",
    color: "#E8E6DE",
    padding: "12px 22px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: "clamp(22px, 3vw, 30px)",
    textAlign: "center",
    margin: "0 0 36px",
  },
  features: { padding: "48px 24px", maxWidth: 1080, margin: "0 auto" },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 20,
  },
  featureCard: {
    background: "#111A2C",
    border: "1px solid #22304a",
    borderRadius: 10,
    padding: 22,
  },
  featureCardTitle: { fontSize: 16, margin: "0 0 8px" },
  featureCardBody: { fontSize: 14, color: "#B9C2D0", lineHeight: 1.55, margin: 0 },
  screenshots: {
    padding: "48px 24px 64px",
    maxWidth: 1080,
    margin: "0 auto",
  },
};
