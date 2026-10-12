import { getLocale } from "next-intl/server";
import CompareLayout from "@/components/CompareLayout";
import { buildPageMetadata } from "@/lib/seo";

const PATH = "/compare/litmaps-alternative";

// Facts checked against Litmaps' pricing and help-center pages
// (litmaps.com/pricing, docs.litmaps.com) as of Aug 2026.
const content = {
  en: {
    title: "Litmaps Alternative: OrbLit vs. Litmaps",
    description:
      "Comparing OrbLit and Litmaps for citation mapping: a free open-source tool, Zotero and Mendeley sync, thematic clusters, and data sources — side by side.",
    h1: "OrbLit vs. Litmaps — a free, open-source map built around your reference manager",
    intro:
      "This page compares OrbLit and Litmaps for anyone deciding between the two. Both visualize citation networks. OrbLit is free and open source; Litmaps has a paid Pro tier. The practical differences are how a reference manager fits in — OrbLit supports Zotero and Mendeley — and where each tool's data comes from.",
    tableTitle: "Feature comparison",
    competitorLabel: "Litmaps",
    tableRows: [
      {
        label: "Price",
        orblit: "Free, open source",
        competitor: "Free tier (20 searches, 2 maps, 100 articles/map) · Pro from ~$10/mo",
      },
      {
        label: "Reference manager sync",
        orblit: "Import a whole collection from Zotero or Mendeley and add papers back (incl. PDF), one click",
        competitor: "Zotero Sync is a Pro-only feature, not available on the free plan",
      },
      {
        label: "Thematic clusters",
        orblit: "Yes, automatic via embeddings + clustering",
        competitor: "Not documented as a standalone core feature",
      },
      {
        label: "Citation network visualization",
        orblit: "Yes — interactive map built from citations & references",
        competitor: "Yes, a core feature (timeline and network views)",
      },
      {
        label: "Data source",
        orblit: "OpenAlex (primary), with Semantic Scholar / Crossref abstract fallback",
        competitor: "Semantic Scholar, OpenAlex, and Crossref combined",
      },
      {
        label: "Collaboration / sharing",
        orblit: "Not available",
        competitor: "Team plan available (separate tier)",
      },
    ],
    competitorBetterTitle: "When Litmaps is the better choice",
    competitorBetterPoints: [
      "It's been around longer and has a larger, more established user base in academic circles.",
      "Pro includes automatic weekly alerts for new papers — OrbLit doesn't have this yet.",
      "Its database blends three sources (Semantic Scholar, OpenAlex, Crossref) rather than one primary source.",
    ],
    orblitBetterTitle: "When OrbLit is the better choice",
    orblitBetterPoints: [
      "Write-back to Zotero and Mendeley is included — add papers straight from the map, not locked behind Pro like Litmaps' Zotero Sync.",
      "Thematic clusters and suggested related papers are included, not a paid add-on.",
      "Built on OpenAlex as the primary data source — a fully open, non-commercial database, not a proprietary blend with its own limits.",
    ],
    screenshotCaption:
      "OrbLit's citation network map — filled nodes are papers already in your collection, outlined nodes are discovery papers found around it.",
    ctaLabel: "Start for free",
    relatedLinksTitle: "See also",
    relatedLinks: [
      { href: "https://github.com/Acul01/OrbLit", label: "GitHub" },
      { href: "/compare", label: "All comparisons" },
      { href: "/compare/researchrabbit-alternative", label: "OrbLit vs. ResearchRabbit" },
      { href: "/compare/connected-papers-alternative", label: "OrbLit vs. Connected Papers" },
      { href: "/zotero-citation-map", label: "Citation maps for Zotero and Mendeley" },
    ],
  },
  de: {
    title: "Litmaps Alternative: OrbLit im Vergleich",
    description:
      "OrbLit vs. Litmaps im Vergleich: kostenlos und Open Source, Sync mit Zotero und Mendeley, thematische Cluster und Datenquellen — Fakt gegen Fakt.",
    h1: "OrbLit vs. Litmaps — eine kostenlose, quelloffene Karte um deine Literaturverwaltung",
    intro:
      "Diese Seite vergleicht OrbLit und Litmaps für alle, die zwischen beiden Tools entscheiden. Beide visualisieren Zitationsnetzwerke. OrbLit ist kostenlos und Open Source, Litmaps hat einen bezahlten Pro-Tarif. Die praktischen Unterschiede liegen darin, wie die Literaturverwaltung eingebunden ist — OrbLit unterstützt Zotero und Mendeley — und woher die Daten kommen.",
    tableTitle: "Im Vergleich",
    competitorLabel: "Litmaps",
    tableRows: [
      {
        label: "Preis",
        orblit: "Kostenlos, Open Source",
        competitor: "Free-Tier (20 Suchen, 2 Maps, 100 Artikel/Map) · Pro ab ca. $10/Monat",
      },
      {
        label: "Literaturverwaltung",
        orblit: "Ganze Sammlung aus Zotero oder Mendeley importieren und Paper zurückschreiben (inkl. PDF), ein Klick",
        competitor: "Zotero Sync ist ein reines Pro-Feature, im Free-Tier nicht verfügbar",
      },
      {
        label: "Thematische Cluster",
        orblit: "Ja, automatisch per Embeddings + Clustering",
        competitor: "Nicht als eigenständiges Kernfeature dokumentiert",
      },
      {
        label: "Citation-Network-Visualisierung",
        orblit: "Ja — interaktive Karte aus Zitationen & Referenzen",
        competitor: "Ja, Kernfeature (Timeline- und Netzwerk-Ansicht)",
      },
      {
        label: "Datenquelle",
        orblit: "OpenAlex (primär), mit Semantic-Scholar-/Crossref-Fallback für Abstracts",
        competitor: "Semantic Scholar, OpenAlex und Crossref kombiniert",
      },
      {
        label: "Kollaboration / Sharing",
        orblit: "Nicht vorhanden",
        competitor: "Team-Tarif verfügbar (eigene Stufe)",
      },
    ],
    competitorBetterTitle: "Wann Litmaps die bessere Wahl ist",
    competitorBetterPoints: [
      "Litmaps ist länger am Markt und hat eine größere, etablierte Nutzerbasis in der akademischen Community.",
      "Pro enthält automatische wöchentliche Alerts bei neuen Papern — das hat OrbLit aktuell noch nicht.",
      "Die Datenbasis kombiniert drei Quellen (Semantic Scholar, OpenAlex, Crossref) statt einer primären.",
    ],
    orblitBetterTitle: "Wann OrbLit die bessere Wahl ist",
    orblitBetterPoints: [
      "Schreibzugriff auf Zotero und Mendeley ist enthalten — Paper direkt aus der Karte zurückschreiben, nicht wie bei Litmaps' Zotero Sync hinter Pro versteckt.",
      "Thematische Cluster und vorgeschlagene verwandte Paper sind enthalten, nicht nur gegen Aufpreis.",
      "Basiert primär auf OpenAlex — eine vollständig offene, nicht-kommerzielle Datenbank statt einer proprietären Mischung mit eigenen Limits.",
    ],
    screenshotCaption:
      "OrbLits Zitationsnetzwerk-Karte — gefüllte Punkte sind Paper, die schon in deiner Sammlung sind, Umrisse sind Entdeckungs-Paper drumherum.",
    ctaLabel: "Kostenlos starten",
    relatedLinksTitle: "Siehe auch",
    relatedLinks: [
      { href: "https://github.com/Acul01/OrbLit", label: "GitHub" },
      { href: "/compare", label: "Alle Vergleiche" },
      { href: "/compare/researchrabbit-alternative", label: "OrbLit vs. ResearchRabbit" },
      { href: "/compare/connected-papers-alternative", label: "OrbLit vs. Connected Papers" },
      { href: "/zotero-citation-map", label: "Citation Maps für Zotero und Mendeley" },
    ],
  },
};

export async function generateMetadata() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return buildPageMetadata({ locale, path: PATH, title: c.title, description: c.description });
}

export default async function LitmapsAlternativePage() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return <CompareLayout {...c} />;
}
