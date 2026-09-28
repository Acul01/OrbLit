// Pure, stateless helpers for the OpenAlex citation graph — no React, no
// D3 side effects. Extracted from OrbLitApp.jsx (phase 5 componentization)
// so they're independently readable/testable and reusable from future
// server-side code (e.g. a citation-graph API route) without dragging in
// the whole component.

export const API = "https://api.openalex.org/works";

export const PLOT = { top: 36, right: 28, bottom: 48, left: 56 };
export const MAP_HEIGHT_MIN = 280;
export const MAP_HEIGHT_MAX = 1600;

export const DEFAULT_NODE_COLOR = "#E8E6DE";
export const TAG_PALETTE = [
  "#E05353",
  "#4FD1C5",
  "#C9A227",
  "#7C9CFF",
  "#E07856",
  "#B57EDC",
  "#3DCF7A",
  "#F0A0C0",
  "#5B8DEF",
  "#D4A574",
];

export const MAX_DISCOVERY_NODES = 120;
export const MAX_CITING_PER_PAPER = 12;

/**
 * Y-axis tick values for a log-scale citation axis. d3's default
 * `scale.ticks()` on a log scale returns every integer within each decade
 * (1,2,3,...,9,10,20,30,...) — fine for the scale itself, but as axis
 * labels they crowd together badly near the top of each decade. Ticking
 * only at powers of ten (1, 10, 100, 1000, ...) keeps labels evenly
 * spaced and readable. Falls back to the default ticks when the domain
 * is too narrow to span even two decades (nothing to crowd).
 */
export function logAxisTicks(scale) {
  const [lo, hi] = scale.domain();
  const ticks = [];
  let p = Math.pow(10, Math.floor(Math.log10(Math.max(lo, 1))));
  while (p <= hi) {
    if (p >= lo) ticks.push(p);
    p *= 10;
  }
  if (ticks.length < 2) {
    return scale.ticks(5).map((v) => ({ value: Math.round(v), y: scale(v) }));
  }
  return ticks.map((v) => ({ value: v, y: scale(v) }));
}

export function defaultMapHeight() {
  if (typeof window === "undefined") return 620;
  return Math.min(MAP_HEIGHT_MAX, Math.max(MAP_HEIGHT_MIN, window.innerHeight - 220));
}

export function splitName(fullName) {
  const parts = (fullName || "").trim().split(" ");
  if (parts.length === 1) return { creatorType: "author", name: parts[0] || "Unknown" };
  return {
    creatorType: "author",
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export function reconstructAbstract(idx) {
  if (!idx) return "";
  const words = [];
  Object.entries(idx).forEach(([word, positions]) => {
    positions.forEach((p) => (words[p] = word));
  });
  return words.join(" ");
}

export function shortId(openalexUrl) {
  return openalexUrl.split("/").pop();
}

export function normalizeDoi(doi) {
  if (!doi) return null;
  return String(doi)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .trim()
    .toLowerCase();
}

export function nodeRadius(n) {
  if (n.kind === "collection" || n.kind === "discovery") {
    const d = n.internalDegree || 0;
    return Math.max(5, Math.min(22, 5 + Math.sqrt(d) * 3.2));
  }
  const c = n.cited_by_count || 0;
  return Math.max(7, Math.min(26, 7 + Math.sqrt(c) * 1.4));
}

export function colorFor(kind) {
  if (kind === "collection") return DEFAULT_NODE_COLOR;
  if (kind === "discovery") return DEFAULT_NODE_COLOR;
  if (kind === "seed") return "#C9A227";
  if (kind === "citation") return "#4FD1C5";
  return DEFAULT_NODE_COLOR;
}

/** Visual style for a map node: collection = filled, discovery = outline; tag overrides color. */
export function nodePaint(n, tags) {
  const tag = n.tagId ? tags.find((t) => t.id === n.tagId) : null;
  const color = tag ? tag.color : colorFor(n.kind);
  const outline = n.kind === "discovery";
  return {
    // transparent (not "none") so the interior remains clickable
    fill: outline ? "transparent" : color,
    stroke: color,
    color,
    outline,
  };
}

export async function fetchWorksByOpenAlexIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const works = [];
  const chunkSize = 50;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const params = new URLSearchParams({
      filter: `openalex_id:${chunk.join("|")}`,
      per_page: String(Math.min(chunk.length, 50)),
    });
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAlex ID lookup failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    works.push(...(data.results || []));
  }
  return works;
}

export async function fetchWorksByDois(dois) {
  const unique = [...new Set(dois.filter(Boolean))];
  const works = [];
  // OpenAlex OR syntax: doi:value1|value2|value3  (prefix once; values separated by |)
  const chunkSize = 50;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const params = new URLSearchParams({
      filter: `doi:${chunk.join("|")}`,
      per_page: String(Math.min(chunk.length, 50)),
    });
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAlex lookup failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    works.push(...(data.results || []));
  }
  return works;
}

export async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.min(concurrency, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

function normalizeTitle(label) {
  return (label || "")
    // Some OpenAlex titles carry a literal backslash-n/backslash-t (the
    // two characters "\" + "n", not an actual newline) from a bad data
    // import — collapse those the same as real whitespace, or they'd
    // otherwise slip through as a "different" title and dodge dedup.
    .replace(/\\[nrt]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** OpenAlex works with no display_name fall back to the literal string
 *  "Untitled" in workToNode/addNode below — these carry no useful
 *  information and are filtered out rather than shown as a bare
 *  "Untitled" node on the map. */
export function isUsableTitle(label) {
  const t = normalizeTitle(label);
  return t.length > 0 && t !== "untitled";
}

/** Drops unusable-title nodes and collapses same-title duplicates down to
 *  one node. OpenAlex sometimes has more than one DB entry for what's
 *  really the same paper (preprint + published version, etc.), which
 *  surfaces as duplicate discovery nodes with an identical title; a
 *  "collection" node is always preferred over a duplicate discovery one
 *  since the collection paper was deliberately curated by the user in
 *  Zotero, not auto-fetched. */
export function dedupeNodesByTitle(nodes) {
  const kindPriority = { collection: 0, seed: 0, discovery: 1, citation: 2, reference: 2 };
  const byTitle = new Map();
  for (const n of nodes) {
    if (!isUsableTitle(n.label)) continue;
    const key = normalizeTitle(n.label);
    const existing = byTitle.get(key);
    if (!existing || (kindPriority[n.kind] ?? 3) < (kindPriority[existing.kind] ?? 3)) {
      byTitle.set(key, n);
    }
  }
  return [...byTitle.values()];
}

export function workToNode(w, kind) {
  return {
    id: shortId(w.id),
    label: w.display_name || "Untitled",
    year: w.publication_year,
    cited_by_count: w.cited_by_count || 0,
    referenced_works: w.referenced_works || [],
    cited_by_api_url: w.cited_by_api_url,
    doi: normalizeDoi(w.doi),
    authorships: w.authorships || [],
    primary_location: w.primary_location || null,
    abstract: w.abstract_inverted_index
      ? reconstructAbstract(w.abstract_inverted_index)
      : undefined,
    kind,
    tagId: null,
    internalDegree: 0,
    x: 0,
    y: 0,
  };
}

/** Shorten a directed edge so arrowheads sit on the circle rim. */
export function edgeEndpoints(s, t, curveSign = 0) {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const sr = nodeRadius(s);
  const tr = nodeRadius(t) + 5;
  let x1 = s.x + ux * sr;
  let y1 = s.y + uy * sr;
  let x2 = t.x - ux * tr;
  let y2 = t.y - uy * tr;

  if (curveSign) {
    const offset = Math.min(28, dist * 0.18) * curveSign;
    const mx = (x1 + x2) / 2 - uy * offset;
    const my = (y1 + y2) / 2 + ux * offset;
    return { curved: true, x1, y1, x2, y2, mx, my };
  }
  return { curved: false, x1, y1, x2, y2 };
}
