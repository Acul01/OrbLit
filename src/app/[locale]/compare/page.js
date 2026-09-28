import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { buildPageMetadata } from "@/lib/seo";

const PATH = "/compare";

// Human-facing hub for the three /compare/*-alternative pages — the only
// place they're linked from besides each other. Also gives the footer's
// "Alternatives" link somewhere real to point at, and adds one more
// internal link into each comparison page (good for both visitors and
// crawl discovery).
const content = {
  en: {
    title: "OrbLit vs. Litmaps, ResearchRabbit & Connected Papers",
    description:
      "Comparing OrbLit against Litmaps, ResearchRabbit, and Connected Papers — a free open-source tool, Zotero sync, thematic clusters, and honest trade-offs.",
    h1: "OrbLit vs. other citation mapping tools",
    intro: "Honest, side-by-side comparisons — including where the other tool is actually the better fit.",
    cards: [
      {
        href: "/compare/litmaps-alternative",
        title: "OrbLit vs. Litmaps",
        body: "OrbLit is free and open source. Zotero Sync is Pro-only on Litmaps and included in OrbLit, and the tools use different data sources.",
      },
      {
        href: "/compare/researchrabbit-alternative",
        title: "OrbLit vs. ResearchRabbit",
        body: "Free-forever collaboration vs. two-way Zotero sync — the two tools optimize for different things.",
      },
      {
        href: "/compare/connected-papers-alternative",
        title: "OrbLit vs. Connected Papers",
        body: "One persistent collection map vs. a fresh graph per origin paper.",
      },
    ],
    useCaseLabel: "Not comparing tools? See how OrbLit works with your Zotero library →",
    useCaseHref: "/zotero-citation-map",
  },
  de: {
    title: "OrbLit vs. Litmaps, ResearchRabbit & Connected Papers",
    description:
      "OrbLit im Vergleich zu Litmaps, ResearchRabbit und Connected Papers — kostenlos und Open Source, Zotero-Sync, thematische Cluster und ehrliche Abwägungen.",
    h1: "OrbLit im Vergleich zu anderen Citation-Mapping-Tools",
    intro: "Ehrliche Vergleiche — auch dort, wo das andere Tool tatsächlich die bessere Wahl ist.",
    cards: [
      {
        href: "/compare/litmaps-alternative",
        title: "OrbLit vs. Litmaps",
        body: "OrbLit ist kostenlos und Open Source. Zotero Sync ist bei Litmaps nur in Pro, bei OrbLit enthalten — die Datenquellen unterscheiden sich.",
      },
      {
        href: "/compare/researchrabbit-alternative",
        title: "OrbLit vs. ResearchRabbit",
        body: "Kostenlose Kollaboration vs. Zwei-Wege-Zotero-Sync — beide Tools setzen unterschiedliche Prioritäten.",
      },
      {
        href: "/compare/connected-papers-alternative",
        title: "OrbLit vs. Connected Papers",
        body: "Eine durchgehende Sammlungskarte vs. ein neuer Graph pro Startpaper.",
      },
    ],
    useCaseLabel: "Kein Tool-Vergleich gesucht? So funktioniert OrbLit mit deiner Zotero-Bibliothek →",
    useCaseHref: "/zotero-citation-map",
  },
};

export async function generateMetadata() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return buildPageMetadata({ locale, path: PATH, title: c.title, description: c.description });
}

export default async function ComparePage() {
  const locale = await getLocale();
  const c = content[locale] || content.en;

  return (
    <div style={s.page}>
      <MarketingHeader />

      <div style={s.content}>
        <h1 style={s.h1}>{c.h1}</h1>
        <p style={s.intro}>{c.intro}</p>

        <div style={s.cards}>
          {c.cards.map((card) => (
            <Link key={card.href} href={card.href} style={s.card}>
              <h2 style={s.cardTitle}>{card.title}</h2>
              <p style={s.cardBody}>{card.body}</p>
            </Link>
          ))}
        </div>

        <Link href={c.useCaseHref} style={s.useCaseLink}>
          {c.useCaseLabel}
        </Link>
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
  content: { maxWidth: 760, margin: "0 auto", padding: "48px 24px 64px", textAlign: "center" },
  h1: { fontSize: "clamp(24px, 3.6vw, 34px)", lineHeight: 1.25, margin: "0 0 14px" },
  intro: { color: "#B9C2D0", fontSize: 15.5, lineHeight: 1.6, margin: "0 0 36px" },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    textAlign: "left",
  },
  card: {
    display: "block",
    background: "#111A2C",
    border: "1px solid #22304a",
    borderRadius: 10,
    padding: 22,
    textDecoration: "none",
    color: "inherit",
  },
  cardTitle: { fontSize: 16, margin: "0 0 8px", color: "#4FD1C5" },
  cardBody: { fontSize: 13.5, lineHeight: 1.55, color: "#B9C2D0", margin: 0 },
  useCaseLink: {
    display: "inline-block",
    marginTop: 32,
    color: "#4FD1C5",
    fontSize: 14,
    textDecoration: "none",
  },
};
