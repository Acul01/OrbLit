// Fallback chain for papers where OpenAlex has no abstract:
//   1. OpenAlex (handled by the caller before this ever runs)
//   2. Semantic Scholar — by DOI, cleanest data, no XML stripping needed
//   3. Crossref — by DOI, only some publishers submit abstracts, and when
//      they do it's usually wrapped in JATS-ish tags that need stripping
//   4. PDF text extraction — last resort, only for papers with a legally
//      open-access PDF (OpenAlex's own best_oa_location.pdf_url — the
//      same field the "Add to Zotero" PDF-attach feature uses). Never
//      attempted against a paywalled paper, since we'd have no right to
//      the PDF in the first place — and papers still missing an abstract
//      at this point skew heavily towards being closed-access anyway, so
//      this only helps a narrow slice of cases.
//
// SEMANTIC_SCHOLAR_API_KEY (set in Vercel) gives a dedicated 1 req/s
// instead of the much stricter shared unauthenticated pool — still works
// without it, just far more likely to hit 429s.

// pdf-parse v2 (pdfjs-dist based) needs browser globals (DOMMatrix etc.)
// that don't exist in Vercel's Node serverless runtime and crashed this
// entire route — pinned to v1.x instead, a plain-Node text extractor with
// no DOM dependency.
import pdf from "pdf-parse/lib/pdf-parse.js";
import { API as OPENALEX_WORKS_API } from "@/lib/citation-graph";
import { s2Fetch } from "@/lib/semantic-scholar-client";

const S2_API = "https://api.semanticscholar.org/graph/v1/paper";
const CROSSREF_API = "https://api.crossref.org/works";
const CONTACT_EMAIL = "rippeluca@gmail.com"; // Crossref "polite pool" mailto
const PDF_MAX_BYTES = 20 * 1024 * 1024; // skip anything unusually large
const PDF_FETCH_TIMEOUT_MS = 15000;

async function fetchFromSemanticScholar(doi) {
  try {
    const res = await s2Fetch(`${S2_API}/DOI:${encodeURIComponent(doi)}?fields=abstract`);
    if (!res.ok) {
      console.log(`[abstract-fallback] S2 ${res.status} for ${doi}`);
      return null;
    }
    const data = await res.json();
    if (!data.abstract) {
      console.log(`[abstract-fallback] S2 200 but no abstract field for ${doi}`);
    }
    return data.abstract || null;
  } catch (e) {
    console.log(`[abstract-fallback] S2 threw for ${doi}:`, e?.message);
    return null;
  }
}

/** Crossref abstracts are usually wrapped in JATS-like tags, e.g.
 *  "<jats:p>Some text...</jats:p>" — strip tags and collapse whitespace
 *  down to plain text. */
function stripJats(raw) {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFromCrossref(doi) {
  try {
    const res = await fetch(
      `${CROSSREF_API}/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(CONTACT_EMAIL)}`
    );
    if (!res.ok) {
      console.log(`[abstract-fallback] Crossref ${res.status} for ${doi}`);
      return null;
    }
    const data = await res.json();
    const raw = data.message?.abstract;
    if (!raw) {
      console.log(`[abstract-fallback] Crossref 200 but no abstract field for ${doi}`);
      return null;
    }
    const cleaned = stripJats(raw);
    return cleaned || null;
  } catch (e) {
    console.log(`[abstract-fallback] Crossref threw for ${doi}:`, e?.message);
    return null;
  }
}

async function getOpenAlexPdfUrl(workId) {
  try {
    const res = await fetch(`${OPENALEX_WORKS_API}/${workId}`);
    if (!res.ok) return null;
    const w = await res.json();
    return (
      w.best_oa_location?.pdf_url ||
      (w.open_access?.is_oa ? w.open_access?.oa_url : null) ||
      null
    );
  } catch {
    return null;
  }
}

/** Heuristically pulls the abstract out of a PDF's raw extracted text: find
 *  an "Abstract" heading, take everything up to the next section-like
 *  marker (Introduction/Keywords/etc.), and sanity-check the result's
 *  length so garbage (no heading found, or a runaway match spanning half
 *  the paper) comes back as null rather than as a bogus "abstract". */
function extractAbstractFromText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const headingMatch = normalized.match(/\babstract\b[:.]?\s*/i);
  if (!headingMatch) return null;

  const rest = normalized.slice(headingMatch.index + headingMatch[0].length);
  const window = rest.slice(0, 4000);
  const endMarkers =
    /\b(1\.?\s*introduction|introduction|keywords|index terms|ccs concepts|categories and subject descriptors)\b/i;
  const endMatch = window.match(endMarkers);
  const candidate = (endMatch ? window.slice(0, endMatch.index) : window.slice(0, 2000)).trim();

  if (candidate.length < 100 || candidate.length > 3000) return null;
  return candidate;
}

async function fetchFromPdfExtraction(workId) {
  const pdfUrl = await getOpenAlexPdfUrl(workId);
  if (!pdfUrl) return null;

  let buffer;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);
    const res = await fetch(pdfUrl, { signal: controller.signal }).finally(() =>
      clearTimeout(timeout)
    );
    if (!res.ok) {
      console.log(`[abstract-fallback] PDF download ${res.status} for ${workId}`);
      return null;
    }
    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > PDF_MAX_BYTES) {
      console.log(`[abstract-fallback] PDF too large (${contentLength}B) for ${workId}, skipping`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > PDF_MAX_BYTES) {
      console.log(`[abstract-fallback] PDF too large after download for ${workId}, skipping`);
      return null;
    }
    buffer = Buffer.from(arrayBuffer);
  } catch (e) {
    console.log(`[abstract-fallback] PDF download threw for ${workId}:`, e?.message);
    return null;
  }

  try {
    // Abstracts live on page 1 (occasionally spilling onto page 2) — no
    // need to parse the whole paper.
    const result = await pdf(buffer, { max: 2 });
    const abstract = extractAbstractFromText(result.text || "");
    if (!abstract) {
      console.log(`[abstract-fallback] PDF text extracted but no clear abstract for ${workId}`);
    }
    return abstract;
  } catch (e) {
    console.log(`[abstract-fallback] PDF parse threw for ${workId}:`, e?.message);
    return null;
  }
}

/** Tries each fallback source in turn for a single paper, returning the
 *  first non-empty abstract found (or null if none had one). Only call
 *  this for papers that already have no abstract from OpenAlex — it's a
 *  fallback, not a replacement for the primary source. `workId` is the
 *  OpenAlex short id (e.g. "W123..."), used only for the PDF-extraction
 *  last resort. */
export async function resolveAbstractFallback(doi, workId) {
  if (doi) {
    const fromS2 = await fetchFromSemanticScholar(doi);
    if (fromS2) return fromS2;
    const fromCrossref = await fetchFromCrossref(doi);
    if (fromCrossref) return fromCrossref;
  }
  if (workId) {
    const fromPdf = await fetchFromPdfExtraction(workId);
    if (fromPdf) return fromPdf;
  }
  console.log(`[abstract-fallback] no abstract found anywhere for ${doi || workId}`);
  return null;
}
