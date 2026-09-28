import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GITHUB_URL } from "@/lib/seo";

/** Shared footer for public marketing pages — same rights/social/legal
 *  links everywhere, extracted from the landing page for the same reason
 *  as MarketingHeader. */
export default function MarketingFooter() {
  const t = useTranslations("landing.footer");
  return (
    <footer style={s.footer}>
      <span>{t("rights", { year: new Date().getFullYear() })}</span>
      <nav style={s.footerLinks}>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={s.footerLink}>
          {t("github")}
        </a>
        <Link href="/compare" style={s.footerLink}>
          {t("alternatives")}
        </Link>
        <Link href="/legal/impressum" style={s.footerLink}>
          {t("impressum")}
        </Link>
        <Link href="/legal/datenschutz" style={s.footerLink}>
          {t("privacy")}
        </Link>
        <Link href="/legal/agb" style={s.footerLink}>
          {t("terms")}
        </Link>
      </nav>
    </footer>
  );
}

const s = {
  footer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    textAlign: "center",
    padding: "24px",
    borderTop: "1px solid #1E2A42",
    color: "#5D6B85",
    fontSize: 13,
  },
  footerLinks: { display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" },
  footerLink: { color: "#5D6B85", textDecoration: "none", fontSize: 12 },
};
