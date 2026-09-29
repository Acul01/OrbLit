import { API as OPENALEX_WORKS_API } from "@/lib/citation-graph";

export function isOpenAlexWorkId(id) {
  return typeof id === "string" && /^W\d+$/.test(id);
}

/** Open-access PDF URL for one OpenAlex work, taken from OpenAlex itself.
 *  The work id is restricted to `W` + digits so it cannot change the host
 *  or the path of this request. */
export async function fetchOpenAlexPdfUrl(workId) {
  if (!isOpenAlexWorkId(workId)) return null;
  try {
    const res = await fetch(`${OPENALEX_WORKS_API}/${workId}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const work = await res.json();
    return (
      work.best_oa_location?.pdf_url ||
      (work.open_access?.is_oa ? work.open_access?.oa_url : null) ||
      null
    );
  } catch {
    return null;
  }
}
