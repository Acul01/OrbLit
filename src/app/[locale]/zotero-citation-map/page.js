import { getLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { buildPageMetadata } from "@/lib/seo";

const PATH = "/zotero-citation-map";

const content = {
  en: {
    title: "Zotero Citation Map — Visualize Your Library | OrbLit",
    description:
      "Turn your Zotero library into an interactive citation network — connect once, see how your papers cite each other, and discover what's missing.",
    h1: "Turn your Zotero library into a citation map",
    intro:
      "Your Zotero library grows one saved paper at a time, but Zotero itself never shows you how those papers actually relate to each other. OrbLit connects to your library and builds that picture — a citation network, thematic clusters, and related papers you haven't collected yet.",
    problemTitle: "The problem: a library that keeps growing, but stays flat",
    problemBody:
      "A folder full of PDFs and a flat list of references doesn't tell you which papers are foundational, which cite each other, or where the gaps in your reading are. That structure exists — Zotero just doesn't surface it.",
    solutionTitle: "The solution: a map built directly from your collection",
    solutionBody:
      "OrbLit reads your Zotero library (or a single collection within it) and turns it into an interactive citation network: which papers reference which, clustered by theme, with related papers OpenAlex knows about that aren't in your library yet — all without leaving your existing Zotero workflow.",
    stepsTitle: "How it works",
    steps: [
      "Connect your Zotero library — takes one API key, no software to install.",
      "OrbLit builds a citation network from your collection via OpenAlex.",
      "Explore thematic clusters and papers related to your collection that you haven't collected yet.",
      "Add anything useful straight back to Zotero, PDF included — no manual export/import round-trip.",
    ],
    screenshotCaption:
      "OrbLit's citation network map — filled nodes are papers already in your collection, outlined nodes are discovery papers found around it.",
    ctaLabel: "Start for free",
    relatedLinksTitle: "See also",
    relatedLinks: [
      { href: "https://github.com/Acul01/OrbLit", label: "GitHub" },
      { href: "/compare", label: "All comparisons" },
      { href: "/compare/litmaps-alternative", label: "OrbLit vs. Litmaps" },
      { href: "/compare/researchrabbit-alternative", label: "OrbLit vs. ResearchRabbit" },
      { href: "/compare/connected-papers-alternative", label: "OrbLit vs. Connected Papers" },
    ],
  },
  de: {
    title: "Zotero Citation Map — Bibliothek visualisieren | OrbLit",
    description:
      "Verwandle deine Zotero-Bibliothek in ein interaktives Zitationsnetzwerk — einmal verbinden, sehen wie deine Paper zusammenhängen, Lücken entdecken.",
    h1: "Verwandle deine Zotero-Bibliothek in eine Citation Map",
    intro:
      "Deine Zotero-Bibliothek wächst mit jedem gespeicherten Paper, aber Zotero selbst zeigt nie, wie diese Paper tatsächlich zusammenhängen. OrbLit verbindet sich mit deiner Bibliothek und macht genau das sichtbar — ein Zitationsnetzwerk, thematische Cluster und verwandte Paper, die du noch nicht gesammelt hast.",
    problemTitle: "Das Problem: eine Bibliothek, die wächst, aber flach bleibt",
    problemBody:
      "Ein Ordner voller PDFs und eine flache Liste von Referenzen zeigt nicht, welche Paper grundlegend sind, welche sich gegenseitig zitieren oder wo Lücken in der eigenen Recherche liegen. Diese Struktur existiert — Zotero macht sie nur nicht sichtbar.",
    solutionTitle: "Die Lösung: eine Karte direkt aus deiner Sammlung",
    solutionBody:
      "OrbLit liest deine Zotero-Bibliothek (oder eine einzelne Sammlung darin) und macht daraus ein interaktives Zitationsnetzwerk: welche Paper welche referenzieren, nach Thema geclustert, mit verwandten Papern, die OpenAlex kennt und die noch nicht in deiner Bibliothek sind — ohne deinen bestehenden Zotero-Workflow zu verlassen.",
    stepsTitle: "So funktioniert's",
    steps: [
      "Zotero-Bibliothek verbinden — ein API-Key genügt, keine Software zu installieren.",
      "OrbLit baut aus deiner Sammlung ein Zitationsnetzwerk über OpenAlex auf.",
      "Thematische Cluster erkunden und verwandte Paper entdecken, die du noch nicht gesammelt hast.",
      "Alles Nützliche direkt zurück zu Zotero hinzufügen, inklusive PDF — ohne manuellen Export-/Import-Umweg.",
    ],
    screenshotCaption:
      "OrbLits Zitationsnetzwerk-Karte — gefüllte Punkte sind Paper, die schon in deiner Sammlung sind, Umrisse sind Entdeckungs-Paper drumherum.",
    ctaLabel: "Kostenlos starten",
    relatedLinksTitle: "Siehe auch",
    relatedLinks: [
      { href: "https://github.com/Acul01/OrbLit", label: "GitHub" },
      { href: "/compare", label: "Alle Vergleiche" },
      { href: "/compare/litmaps-alternative", label: "OrbLit vs. Litmaps" },
      { href: "/compare/researchrabbit-alternative", label: "OrbLit vs. ResearchRabbit" },
      { href: "/compare/connected-papers-alternative", label: "OrbLit vs. Connected Papers" },
    ],
  },
};

export async function generateMetadata() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return buildPageMetadata({ locale, path: PATH, title: c.title, description: c.description });
}

export default async function ZoteroCitationMapPage() {
  const locale = await getLocale();
  const c = content[locale] || content.en;

  return (
    <div style={s.page}>
      <MarketingHeader />

      <div style={s.content}>
        <h1 style={s.h1}>{c.h1}</h1>
        <p style={s.intro}>{c.intro}</p>

        <div style={s.screenshotBlock}>
          <Image
            src="/screenshots/map_example.png"
            alt={c.screenshotCaption}
            style={s.screenshot}
            width={1705}
            height={903}
          />
          <p style={s.screenshotCaption}>{c.screenshotCaption}</p>
        </div>

        <section style={s.section}>
          <h2 style={s.h2}>{c.problemTitle}</h2>
          <p style={s.body}>{c.problemBody}</p>
        </section>

        <section style={s.section}>
          <h2 style={s.h2}>{c.solutionTitle}</h2>
          <p style={s.body}>{c.solutionBody}</p>
        </section>

        <section style={s.section}>
          <h2 style={s.h2}>{c.stepsTitle}</h2>
          <ol style={s.steps}>
            {c.steps.map((step, i) => (
              <li key={i} style={s.step}>
                <span style={s.stepNumber}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <div style={s.ctaBlock}>
          <Link href="/signup" style={s.ctaPrimary}>
            {c.ctaLabel}
          </Link>
        </div>

        <nav style={s.related}>
          <span style={s.relatedTitle}>{c.relatedLinksTitle}</span>
          <div style={s.relatedLinks}>
            {c.relatedLinks.map((link) =>
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
  body: { fontSize: 14.5, lineHeight: 1.65, color: "#C7CEDB", margin: 0 },
  steps: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 },
  step: { display: "flex", gap: 12, fontSize: 14.5, lineHeight: 1.6, color: "#E8E6DE" },
  stepNumber: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#1a2740",
    border: "1px solid #2A3B5C",
    color: "#4FD1C5",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
