import { getLocale } from "next-intl/server";
import CompareLayout from "@/components/CompareLayout";
import { buildPageMetadata } from "@/lib/seo";

const PATH = "/compare/connected-papers-alternative";

// Facts checked via the CASRAI research-guide summary of Connected
// Papers (casrai.org/guides/connected-papers) and their Medium
// announcement of paid plans, as of Aug 2026.
const content = {
  en: {
    title: "Connected Papers Alternative: OrbLit vs. Connected Papers",
    description:
      "Comparing OrbLit and Connected Papers: one persistent collection map vs. single-origin graphs, Zotero direction, and a free open-source tool.",
    h1: "OrbLit vs. Connected Papers — one growing map vs. a graph per paper",
    intro:
      "This page compares OrbLit and Connected Papers for anyone deciding between the two. Connected Papers excels at exploring the neighborhood of one paper at a time, with no account required. OrbLit is built around one persistent map of your whole collection instead — the right choice depends on which of those two workflows matches how you actually work.",
    tableTitle: "Feature comparison",
    competitorLabel: "Connected Papers",
    tableRows: [
      {
        label: "Price",
        orblit: "Free, open source",
        competitor: "No account needed, 5 new graphs/month free · Academic from $5/mo, Business $15/mo (billed quarterly)",
      },
      {
        label: "Zotero sync",
        orblit: "Import a whole collection + add papers back to Zotero (incl. PDF), one click",
        competitor: "Export only, to Zotero/Mendeley/EndNote — no import or ongoing sync",
      },
      {
        label: "Thematic clusters",
        orblit: "Yes, a dedicated Themes map for your whole collection",
        competitor: "Yes, a core feature — similarity-based clustering around a single origin paper",
      },
      {
        label: "Citation network visualization",
        orblit: "Yes — one persistent, growing map of your collection",
        competitor: "Yes, but scoped per graph: one origin paper per graph, not a standing collection view",
      },
      {
        label: "Data source",
        orblit: "OpenAlex (primary), with Semantic Scholar / Crossref abstract fallback",
        competitor: "Semantic Scholar",
      },
      {
        label: "Collaboration / sharing",
        orblit: "Not available",
        competitor: "Limited — saved papers and graph history, no shared or monitored collections",
      },
    ],
    competitorBetterTitle: "When Connected Papers is the better choice",
    competitorBetterPoints: [
      "No account needed at all, up to the monthly graph limit — the fastest possible way to explore a single paper's neighborhood.",
      "It's sharply focused on one thing (exploring around one origin paper) and does it fast, without any collection setup.",
      "It's been around longer with broad recognition in the academic community.",
    ],
    orblitBetterTitle: "When OrbLit is the better choice",
    orblitBetterPoints: [
      "OrbLit builds one persistent, growing map of your whole collection instead of a separate graph per origin paper — closer to how an actual literature review works than exploring one paper's neighborhood at a time.",
      "Zotero goes both ways — import a whole collection and add papers straight back into Zotero (with the PDF). Connected Papers can only export to Zotero, not import or sync from it.",
      "Thematic clustering applies across your whole collection, not just the papers similar to a single origin paper.",
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
      { href: "/zotero-citation-map", label: "Citation maps from your Zotero library" },
    ],
  },
  de: {
    title: "Connected Papers Alternative: OrbLit im Vergleich",
    description:
      "OrbLit vs. Connected Papers im Vergleich: eine durchgehende Sammlungskarte vs. Einzel-Graphen, Zotero-Richtung und ein kostenloses Open-Source-Tool.",
    h1: "OrbLit vs. Connected Papers — eine wachsende Karte vs. ein Graph pro Paper",
    intro:
      "Diese Seite vergleicht OrbLit und Connected Papers für alle, die zwischen beiden Tools entscheiden. Connected Papers ist stark darin, die Umgebung eines einzelnen Papers zu erkunden, ganz ohne Account. OrbLit baut stattdessen auf einer durchgehenden Karte deiner gesamten Sammlung auf — welches Tool passt, hängt davon ab, welcher der beiden Arbeitsweisen näher an deiner eigenen liegt.",
    tableTitle: "Im Vergleich",
    competitorLabel: "Connected Papers",
    tableRows: [
      {
        label: "Preis",
        orblit: "Kostenlos, Open Source",
        competitor: "Ohne Account nutzbar, 5 neue Graphen/Monat kostenlos · Academic ab $5/Monat, Business $15/Monat (quartalsweise)",
      },
      {
        label: "Zotero-Sync",
        orblit: "Ganze Sammlung importieren + Paper zurück zu Zotero hinzufügen (inkl. PDF), ein Klick",
        competitor: "Nur Export zu Zotero/Mendeley/EndNote — kein Import oder fortlaufender Sync",
      },
      {
        label: "Thematische Cluster",
        orblit: "Ja, eigene Themes-Karte für die gesamte Sammlung",
        competitor: "Ja, Kernfeature — Ähnlichkeits-basiertes Clustering rund um ein einzelnes Startpaper",
      },
      {
        label: "Citation-Network-Visualisierung",
        orblit: "Ja — eine durchgehende, wachsende Karte der eigenen Sammlung",
        competitor: "Ja, aber pro Graph begrenzt: ein Startpaper pro Graph, keine stehende Sammlungsansicht",
      },
      {
        label: "Datenquelle",
        orblit: "OpenAlex (primär), mit Semantic-Scholar-/Crossref-Fallback für Abstracts",
        competitor: "Semantic Scholar",
      },
      {
        label: "Kollaboration / Sharing",
        orblit: "Nicht vorhanden",
        competitor: "Eingeschränkt — gespeicherte Paper und Graph-Historie, keine geteilten oder überwachten Collections",
      },
    ],
    competitorBetterTitle: "Wann Connected Papers die bessere Wahl ist",
    competitorBetterPoints: [
      "Komplett ohne Account nutzbar, bis zum monatlichen Graph-Limit — der schnellste Weg, die Umgebung eines einzelnen Papers zu erkunden.",
      "Sehr fokussiert auf eine Sache (Erkunden rund um ein Startpaper) und dabei schnell, ganz ohne Sammlungs-Setup.",
      "Connected Papers ist länger am Markt und in der akademischen Community breit bekannt.",
    ],
    orblitBetterTitle: "Wann OrbLit die bessere Wahl ist",
    orblitBetterPoints: [
      "OrbLit baut eine durchgehende, wachsende Karte der gesamten Sammlung statt eines separaten Graphen pro Startpaper — näher an einer echten Literaturrecherche als das Erkunden einzelner Paper-Umgebungen.",
      "Zotero funktioniert in beide Richtungen — ganze Sammlung importieren und Paper direkt zurück zu Zotero hinzufügen (inkl. PDF). Connected Papers kann nur zu Zotero exportieren, nicht importieren oder synchronisieren.",
      "Thematisches Clustering gilt für die gesamte Sammlung, nicht nur für die Paper rund um ein einzelnes Startpaper.",
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
      { href: "/zotero-citation-map", label: "Citation Maps aus deiner Zotero-Bibliothek" },
    ],
  },
};

export async function generateMetadata() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return buildPageMetadata({ locale, path: PATH, title: c.title, description: c.description });
}

export default async function ConnectedPapersAlternativePage() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return <CompareLayout {...c} />;
}
