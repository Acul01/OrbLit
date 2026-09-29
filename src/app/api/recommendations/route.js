import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findRelatedPapers } from "@/lib/recommendations";
import { readJson } from "@/lib/request-body";
import { assertWithinRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_DOIS = 100;
const MAX_LIMIT = 20;
const MAX_EXCLUDE = 5000;

function optionalInt(value) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) return undefined;
  return n;
}

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

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error?.status === 413) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { dois, excludeIds, limit, minYear, maxYear, minCitations, maxCitations } = body;
  if (!Array.isArray(dois) || dois.length === 0 || dois.length > MAX_DOIS) {
    return NextResponse.json({ error: "Missing seed DOIs" }, { status: 400 });
  }
  const seedDois = dois.filter((doi) => typeof doi === "string" && doi.trim() && doi.length <= 256);
  if (seedDois.length === 0) {
    return NextResponse.json({ error: "Missing seed DOIs" }, { status: 400 });
  }
  if (Array.isArray(excludeIds) && excludeIds.length > MAX_EXCLUDE) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await assertWithinRateLimit(user.id, "recommendations", 30);
  } catch (error) {
    return rateLimitResponse(error);
  }

  const cappedLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || MAX_LIMIT));

  try {
    const papers = await findRelatedPapers(
      seedDois,
      Array.isArray(excludeIds) ? excludeIds.filter((id) => typeof id === "string") : [],
      cappedLimit,
      {
        minYear: optionalInt(minYear),
        maxYear: optionalInt(maxYear),
        minCitations: optionalInt(minCitations),
        maxCitations: optionalInt(maxCitations),
      }
    );
    return NextResponse.json({ papers });
  } catch {
    console.error("Recommendations request failed");
    return NextResponse.json({ error: "Failed to find related papers" }, { status: 502 });
  }
}
