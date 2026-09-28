import { getLocale } from "next-intl/server";
import CompareLayout from "@/components/CompareLayout";
import { buildPageMetadata } from "@/lib/seo";

const PATH = "/compare/researchrabbit-alternative";

// Facts verified against ResearchRabbit's own pricing page
// (researchrabbit.ai/pricing) and Zotero Importer help article as of
// Aug 2026. Where their own docs didn't state something outright, it's
// marked [VERIFY] — see the reply to the user for the full list.
const content = {
  en: {
    title: "ResearchRabbit Alternative: OrbLit vs. ResearchRabbit",
    description:
      "Comparing OrbLit and ResearchRabbit: a free open-source tool, Zotero sync direction, thematic clusters, and collaboration — an honest side-by-side.",
    h1: "OrbLit vs. ResearchRabbit — two-way Zotero sync vs. free-forever collaboration",
    intro:
      "This page compares OrbLit and ResearchRabbit for anyone deciding between the two. ResearchRabbit is free with no real cap on core use, and OrbLit is free and open source. The real trade-off isn't price — it's how each tool connects to Zotero and whether you need to collaborate with others.",
    tableTitle: "Feature comparison",
    competitorLabel: "ResearchRabbit",
    tableRows: [
      {
        label: "Price",
        orblit: "Free, open source",
        competitor: "Free Forever (unlimited searches/collections, 50 seed papers/search) · RR+ from ~$10/mo",
      },
      {
        label: "Zotero sync",
        orblit: "Import a whole collection + add papers back to Zotero (incl. PDF), one click",
        competitor: "One-way import only (Zotero Importer); true two-way sync is, per their own docs, still in development",
      },
      {
        label: "Thematic clusters",
        orblit: "Yes, a dedicated Themes map view, automatic via embeddings + clustering",
        competitor: "Some visual grouping within the network maps [VERIFY: a standalone cluster view or implicit layout only?]",
      },
      {
        label: "Citation network visualization",
        orblit: "Yes — interactive map built from citations & references",
        competitor: "Yes, a core feature (earlier/later/similar-work maps)",
      },
      {
        label: "Data source",
        orblit: "OpenAlex (primary), with Semantic Scholar / Crossref abstract fallback",
        competitor: "Semantic Scholar and OpenAlex",
      },
      {
        label: "Collaboration / sharing",
        orblit: "Not available",
        competitor: "Yes — shared collections, included free, a core feature",
      },
    ],
    competitorBetterTitle: "When ResearchRabbit is the better choice",
    competitorBetterPoints: [
      "It's genuinely free with no map/paper cap on core use — its Free Forever tier covers most individual literature-review workflows outright.",
      "Shared collections and collaboration are built in and free — OrbLit doesn't have a collaboration feature yet.",
      "It has a larger, more established user base in academic circles.",
    ],
    orblitBetterTitle: "When OrbLit is the better choice",
    orblitBetterPoints: [
      "OrbLit's Zotero integration already goes both ways — import a whole collection and add papers straight back into Zotero (with the PDF). ResearchRabbit's Zotero Importer is currently one-way only; a real two-way sync is, per their own docs, still in development.",
      "Build the map directly from a Zotero collection you already have, instead of hand-picking or searching for seed papers.",
      "Thematic clusters live in their own dedicated map view, not just an implicit layout inside the citation network.",
    ],
    screenshotCaption:
      "OrbLit's citation network map — filled nodes are papers already in your collection, outlined nodes are discovery papers found around it.",
    ctaLabel: "Start for free",
    relatedLinksTitle: "See also",
    relatedLinks: [
      { href: "https://github.com/Acul01/OrbLit", label: "GitHub" },
      { href: "/compare", label: "All comparisons" },
      { href: "/compare/litmaps-alternative", label: "OrbLit vs. Litmaps" },
      { href: "/compare/connected-papers-alternative", label: "OrbLit vs. Connected Papers" },
      { href: "/zotero-citation-map", label: "Citation maps from your Zotero library" },
    ],
  },
  de: {
    title: "ResearchRabbit Alternative: OrbLit im Vergleich",
    description:
      "OrbLit vs. ResearchRabbit im Vergleich: ein kostenloses Open-Source-Tool, Zotero-Sync-Richtung, thematische Cluster und Kollaboration — ehrlich gegenübergestellt.",
    h1: "OrbLit vs. ResearchRabbit — Zwei-Wege-Zotero-Sync vs. kostenlose Kollaboration",
    intro:
      "Diese Seite vergleicht OrbLit und ResearchRabbit für alle, die zwischen beiden Tools entscheiden. ResearchRabbit ist kostenlos ohne echte Obergrenze bei den Kernfunktionen, OrbLit ist kostenlos und Open Source. Der eigentliche Unterschied liegt nicht im Preis, sondern darin, wie beide Tools mit Zotero verbunden sind und ob Kollaboration gebraucht wird.",
    tableTitle: "Im Vergleich",
    competitorLabel: "ResearchRabbit",
    tableRows: [
      {
        label: "Preis",
        orblit: "Kostenlos, Open Source",
        competitor: "Free Forever (unbegrenzte Suchen/Collections, 50 Seed-Paper/Suche) · RR+ ab ca. $10/Monat",
      },
      {
        label: "Zotero-Sync",
        orblit: "Ganze Sammlung importieren + Paper zurück zu Zotero hinzufügen (inkl. PDF), ein Klick",
        competitor: "Nur Einbahnstraßen-Import (Zotero Importer); echter Zwei-Wege-Sync ist laut eigenen Angaben noch in Entwicklung",
      },
      {
        label: "Thematische Cluster",
        orblit: "Ja, eigene Themes-Kartenansicht, automatisch per Embeddings + Clustering",
        competitor: "Gewisse visuelle Gruppierung innerhalb der Netzwerk-Maps [VERIFY: eigenständige Cluster-Ansicht oder nur implizites Layout?]",
      },
      {
        label: "Citation-Network-Visualisierung",
        orblit: "Ja — interaktive Karte aus Zitationen & Referenzen",
        competitor: "Ja, Kernfeature (Earlier-/Later-/Similar-Work-Maps)",
      },
      {
        label: "Datenquelle",
        orblit: "OpenAlex (primär), mit Semantic-Scholar-/Crossref-Fallback für Abstracts",
        competitor: "Semantic Scholar und OpenAlex",
      },
      {
        label: "Kollaboration / Sharing",
        orblit: "Nicht vorhanden",
        competitor: "Ja — geteilte Collections, kostenlos enthalten, Kernfeature",
      },
    ],
    competitorBetterTitle: "Wann ResearchRabbit die bessere Wahl ist",
    competitorBetterPoints: [
      "Es ist wirklich kostenlos, ohne Karten-/Paper-Obergrenze bei den Kernfunktionen — der Free-Forever-Tarif deckt die meisten individuellen Literaturrecherchen komplett ab.",
      "Geteilte Collections und Kollaboration sind eingebaut und kostenlos — OrbLit hat aktuell keine Kollaborationsfunktion.",
      "ResearchRabbit hat eine größere, etabliertere Nutzerbasis in der akademischen Community.",
    ],
    orblitBetterTitle: "Wann OrbLit die bessere Wahl ist",
    orblitBetterPoints: [
      "OrbLits Zotero-Anbindung funktioniert bereits in beide Richtungen — ganze Sammlung importieren und Paper direkt aus der Karte zurück zu Zotero hinzufügen (inkl. PDF). ResearchRabbits Zotero Importer ist aktuell nur eine Einbahnstraße; echter Zwei-Wege-Sync ist laut eigenen Angaben noch in Entwicklung.",
      "Die Karte lässt sich direkt aus einer bestehenden Zotero-Sammlung aufbauen, statt Seed-Paper einzeln auszuwählen oder zu suchen.",
      "Thematische Cluster haben eine eigene Kartenansicht, nicht nur ein implizites Layout innerhalb des Zitationsnetzwerks.",
    ],
    screenshotCaption:
      "OrbLits Zitationsnetzwerk-Karte — gefüllte Punkte sind Paper, die schon in deiner Sammlung sind, Umrisse sind Entdeckungs-Paper drumherum.",
    ctaLabel: "Kostenlos starten",
    relatedLinksTitle: "Siehe auch",
    relatedLinks: [
      { href: "https://github.com/Acul01/OrbLit", label: "GitHub" },
      { href: "/compare", label: "Alle Vergleiche" },
      { href: "/compare/litmaps-alternative", label: "OrbLit vs. Litmaps" },
      { href: "/compare/connected-papers-alternative", label: "OrbLit vs. Connected Papers" },
      { href: "/zotero-citation-map", label: "Citation Maps aus deiner Zotero-Bibliothek" },
    ],
  },
};

export async function generateMetadata() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return buildPageMetadata({ locale, path: PATH, title: c.title, description: c.description });
}

export default async function ResearchRabbitAlternativePage() {
  const locale = await getLocale();
  const c = content[locale] || content.en;
  return <CompareLayout {...c} />;
}
