import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import OrbitIcon from "@/components/OrbitIcon";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { GITHUB_URL } from "@/lib/seo";

/** Shared top nav for public marketing pages (landing, compare/*,
 *  zotero-citation-map) — logo, locale switcher, login/signup. Extracted
 *  from the landing page so every SEO page gets identical chrome instead
 *  of a bespoke header each. Server-renderable (no "use client" — only
 *  LocaleSwitcher itself needs the client boundary). */
export default function MarketingHeader() {
  const t = useTranslations("landing.nav");
  return (
    <header style={s.nav}>
      <Link href="/" style={s.logoGroup}>
        <OrbitIcon />
        <span style={s.logo}>OrbLit</span>
      </Link>
      <div style={s.navRight}>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={s.navLink}>
          {t("github")}
        </a>
        <LocaleSwitcher />
        <Link href="/login" style={s.navLink}>
          {t("login")}
        </Link>
        <Link href="/signup" style={s.navCta}>
          {t("signup")}
        </Link>
      </div>
    </header>
  );
}

const s = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid #1E2A42",
    flexWrap: "wrap",
    gap: 12,
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "#E8E6DE",
  },
  logo: { fontSize: 18, fontWeight: 700, letterSpacing: 0.5 },
  navRight: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  navLink: { color: "#B9C2D0", textDecoration: "none", fontSize: 14 },
  navCta: {
    background: "#4FD1C5",
    color: "#0B1220",
    padding: "8px 14px",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
};
