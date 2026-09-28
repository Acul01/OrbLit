import Image from "next/image";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import CompareTable from "@/components/CompareTable";

/** Shared shell for the three /compare/*-alternative pages — identical
 *  structure (H1, intro, table, honest "when the other tool wins"
 *  section, "when OrbLit wins" section, screenshot, CTA, internal links),
 *  only the content differs per competitor. Keeps the 3×2-locale content
 *  data-driven (see each page.js) instead of six near-duplicate JSX
 *  files. */
export default function CompareLayout({
  h1,
  intro,
  tableTitle,
  competitorLabel,
  tableRows,
  competitorBetterTitle,
  competitorBetterPoints,
  orblitBetterTitle,
  orblitBetterPoints,
  screenshotCaption,
  ctaLabel,
  relatedLinksTitle,
  relatedLinks,
}) {
  return (
    <div style={s.page}>
      <MarketingHeader />

      <div style={s.content}>
        <h1 style={s.h1}>{h1}</h1>
        <p style={s.intro}>{intro}</p>

        <h2 style={s.h2}>{tableTitle}</h2>
        <CompareTable rows={tableRows} competitorLabel={competitorLabel} />

        <div style={s.screenshotBlock}>
          <Image
            src="/screenshots/map_example.png"
            alt={screenshotCaption}
            style={s.screenshot}
            width={1705}
            height={903}
          />
          <p style={s.screenshotCaption}>{screenshotCaption}</p>
        </div>

        <section style={s.section}>
          <h2 style={s.h2}>{competitorBetterTitle}</h2>
          <ul style={s.list}>
            {competitorBetterPoints.map((point) => (
              <li key={point} style={s.listItem}>
                — {point}
              </li>
            ))}
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.h2}>{orblitBetterTitle}</h2>
          <ul style={s.list}>
            {orblitBetterPoints.map((point) => (
              <li key={point} style={s.listItemGood}>
                <Check size={15} color="#4FD1C5" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <div style={s.ctaBlock}>
          <Link href="/signup" style={s.ctaPrimary}>
            {ctaLabel}
          </Link>
        </div>

        <nav style={s.related}>
          <span style={s.relatedTitle}>{relatedLinksTitle}</span>
          <div style={s.relatedLinks}>
            {relatedLinks.map((link) =>
              link.href.startsWith("http") ? (
                <a
                  key={link.href}
                  href={link.href}
                  style={s.relatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} style={s.relatedLink}>
                  {link.label}
                </Link>
              )
            )}
          </div>
        </nav>
      </div>

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
  },
  content: { maxWidth: 760, margin: "0 auto", padding: "48px 24px 64px" },
  h1: { fontSize: "clamp(24px, 3.6vw, 34px)", lineHeight: 1.25, margin: "0 0 14px" },
  intro: { color: "#B9C2D0", fontSize: 15.5, lineHeight: 1.65, margin: "0 0 28px" },
  screenshotBlock: { margin: "28px 0" },
  screenshot: {
    width: "100%",
    height: "auto",
    borderRadius: 10,
    border: "1px solid #22304a",
    display: "block",
  },
  screenshotCaption: { fontSize: 12.5, color: "#7C8AA3", margin: "8px 0 0", textAlign: "center" },
  section: { margin: "36px 0" },
  h2: { fontSize: 19, margin: "0 0 14px" },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 },
  listItem: {
    fontSize: 14.5,
    lineHeight: 1.6,
    color: "#C7CEDB",
  },
  listItemGood: {
    display: "flex",
    gap: 8,
    fontSize: 14.5,
    lineHeight: 1.6,
    color: "#E8E6DE",
  },
  ctaBlock: { textAlign: "center", margin: "40px 0" },
  ctaPrimary: {
    display: "inline-block",
    background: "#4FD1C5",
    color: "#0B1220",
    padding: "13px 28px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 15.5,
  },
  related: {
    borderTop: "1px solid #1E2A42",
    paddingTop: 24,
    marginTop: 40,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  relatedTitle: { fontSize: 12, color: "#7C8AA3", textTransform: "uppercase", letterSpacing: 0.4 },
  relatedLinks: { display: "flex", gap: 16, flexWrap: "wrap" },
  relatedLink: { color: "#4FD1C5", textDecoration: "none", fontSize: 13.5 },
};
