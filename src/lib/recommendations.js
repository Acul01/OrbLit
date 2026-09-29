// Finds papers that are thematically close to a collection but were never
// surfaced by the citation graph (not referenced by, and not citing, any
// collection paper) — the citation-only "discovery" mechanism the app
// already had can't find these by definition.
//
//   1. Semantic Scholar Recommendations — primary source. Purpose-built
//      for "papers similar to these", using S2's own embedding/citation-
//      graph-trained model, not just shared category tags.
//   2. OpenAlex Topics — fallback if S2 comes up short (too few DOIs to
//      seed with, or the recommendation call itself fails): same broad
//      field, ranked by citation count. Lower precision but needs nothing
//      beyond data already on hand.
//
// Either way, results are resolved back to real OpenAlex Work objects
// (via fetchWorksByDois / a topics-filtered works query) so a suggested
// paper is a normal node with a real OpenAlex id — "Add to Zotero" and
// everything else downstream just works, no special-casing needed.

import { API, fetchWorksByDois, workToNode, dedupeNodesByTitle, shortId } from "@/lib/citation-graph";
import { s2Fetch } from "@/lib/semantic-scholar-client";

const S2_RECOMMENDATIONS_API = "https://api.semanticscholar.org/recommendations/v1/papers";
const MAX_POSITIVE_IDS = 50; // keep the request body reasonable
const MIN_RESULTS_BEFORE_FALLBACK = 5;

async function fetchS2RecommendedDois(seedDois) {
  const positivePaperIds = seedDois.slice(0, MAX_POSITIVE_IDS).map((doi) => `DOI:${doi}`);
  try {
    const res = await s2Fetch(`${S2_RECOMMENDATIONS_API}?fields=externalIds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positivePaperIds, negativePaperIds: [] }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.recommendedPapers || [])
      .map((p) => p.externalIds?.DOI)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Tallies primary_topic across a sample of works and returns the top few
 *  topic ids — used to seed the OpenAlex-Topics fallback query. */
function topTopicIds(works, count = 3) {
  const tally = new Map();
  for (const w of works) {
    const id = w.primary_topic?.id;
    if (!id) continue;
    tally.set(id, (tally.get(id) || 0) + 1);
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([id]) => id);
}

async function fetchTopicFallbackWorks(seedWorks, excludeIds, limit, filters) {
  const topicIds = topTopicIds(seedWorks);
  if (!topicIds.length) return [];
  try {
    const filterParts = [`topics.id:${topicIds.join("|")}`, ...yearCitationFilterParts(filters)];
    const params = new URLSearchParams({
      filter: filterParts.join(","),
      sort: "cited_by_count:desc",
      per_page: String(Math.min(limit * 2, 50)), // over-fetch, excludeIds will trim it
    });
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).filter((w) => !excludeIds.has(shortId(w.id)));
  } catch {
    return [];
  }
}

/** OpenAlex filter fragments for the optional year/citation bounds — used
 *  directly in the Topics-fallback query (OpenAlex supports this natively,
 *  and it's more efficient than fetching then discarding). `>`/`<` are
 *  exclusive in OpenAlex's filter syntax, hence the +/-1 to get an
 *  inclusive min/max. */
function yearCitationFilterParts(filters = {}) {
  const parts = [];
  if (filters.minYear != null) parts.push(`publication_year:>${filters.minYear - 1}`);
  if (filters.maxYear != null) parts.push(`publication_year:<${filters.maxYear + 1}`);
  if (filters.minCitations != null) parts.push(`cited_by_count:>${filters.minCitations - 1}`);
  if (filters.maxCitations != null) parts.push(`cited_by_count:<${filters.maxCitations + 1}`);
  return parts;
}

/** S2's Recommendations endpoint has no year/citation filter of its own —
 *  applied here after resolving to real OpenAlex works, which do carry
 *  that data. */
function passesFilters(w, filters = {}) {
  if (filters.minYear != null && (w.publication_year ?? 0) < filters.minYear) return false;
  if (filters.maxYear != null && (w.publication_year ?? Infinity) > filters.maxYear) return false;
  const citations = w.cited_by_count || 0;
  if (filters.minCitations != null && citations < filters.minCitations) return false;
  if (filters.maxCitations != null && citations > filters.maxCitations) return false;
  return true;
}

/** Returns up to `limit` OpenAlex Work-shaped nodes (kind: "discovery")
 *  that are thematically related to `seedDois` but not already present in
 *  `excludeIds`. `filters` (all optional): { minYear, maxYear,
 *  minCitations, maxCitations }. */
export async function findRelatedPapers(seedDois, excludeIds, limit = 20, filters = {}) {
  const excludeSet = new Set(excludeIds);
  let works = [];

  const recommendedDois = await fetchS2RecommendedDois(seedDois);
  if (recommendedDois.length) {
    try {
      const resolved = await fetchWorksByDois(recommendedDois);
      works = resolved.filter((w) => !excludeSet.has(shortId(w.id)) && passesFilters(w, filters));
    } catch {
      // OpenAlex DOI lookup failed; the topic fallback below still runs.
    }
  }

  // Only pay for the extra OpenAlex round-trip (fetching the seed papers'
  // own topic data) when S2 actually came up short.
  if (works.length < MIN_RESULTS_BEFORE_FALLBACK) {
    try {
      const seedWorks = await fetchWorksByDois(seedDois.slice(0, 20));
      const fromTopics = await fetchTopicFallbackWorks(seedWorks, excludeSet, limit, filters);
      const seenIds = new Set(works.map((w) => w.id));
      for (const w of fromTopics) {
        if (!seenIds.has(w.id)) {
          works.push(w);
          seenIds.add(w.id);
        }
      }
    } catch {
      // Seed lookup failed; return whatever recommendations were already resolved.
    }
  }

  const nodes = dedupeNodesByTitle(works.map((w) => workToNode(w, "discovery"))).slice(0, limit);
  return nodes;
}
