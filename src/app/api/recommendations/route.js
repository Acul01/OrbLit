import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findRelatedPapers } from "@/lib/recommendations";

// POST { dois: string[], excludeIds: string[], limit?, minYear?, maxYear?,
//         minCitations?, maxCitations? }
//
// dois: DOIs of the collection's own papers, used as "seed" examples for
// Semantic Scholar's Recommendations endpoint (falls back to OpenAlex
// Topics if too few come back). excludeIds: every node id already on the
// map (collection + existing discovery) so suggestions never duplicate
// something already there. min/max year/citations are all optional —
// omitted means unbounded on that side.
//
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { dois, excludeIds, limit, minYear, maxYear, minCitations, maxCitations } = await request
    .json()
    .catch(() => ({}));
  if (!Array.isArray(dois) || dois.length === 0) {
    return NextResponse.json({ error: "Missing seed DOIs" }, { status: 400 });
  }

  try {
    const papers = await findRelatedPapers(
      dois.filter(Boolean),
      Array.isArray(excludeIds) ? excludeIds : [],
      limit || 20,
      { minYear, maxYear, minCitations, maxCitations }
    );
    return NextResponse.json({ papers });
  } catch (err) {
    console.error("Recommendations request failed:", err.message);
    return NextResponse.json({ error: "Failed to find related papers" }, { status: 502 });
  }
}
