import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddings } from "@/lib/embeddings";
import { clusterVectors, projectTo2D } from "@/lib/clustering";
import { resolveAbstractFallback } from "@/lib/abstract-fallback";
import { mapPool } from "@/lib/citation-graph";
import { isOpenAlexWorkId } from "@/lib/openalex";
import { readJson } from "@/lib/request-body";
import { assertWithinRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_PAPERS = 300;
const MAX_TITLE = 500;
const MAX_ABSTRACT = 8000;

// POST { papers: [{ id, title, abstract, doi }], clusterCount }
//
// Papers missing an abstract get one more shot here before being excluded:
// resolveAbstractFallback() tries Semantic Scholar, then Crossref (both by
// DOI), then — last resort — extracting it from the paper's own PDF text
// if OpenAlex has a legally open-access PDF for it. This route is the
// authority on the final usable/excluded split — the client sends
// everything it has and lets the server decide, rather than pre-filtering
// client-side, since only the server can run the fallback lookups.
// Newly-resolved abstracts are returned in `resolved` so the client can
// store them on the node permanently (avoids re-fetching the same paper's
// abstract on a future Generate).
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
  const { papers, clusterCount } = body;
  if (!Array.isArray(papers)) {
    return NextResponse.json({ error: "Missing papers" }, { status: 400 });
  }
  if (papers.length > MAX_PAPERS) {
    return NextResponse.json({ error: "Too many papers" }, { status: 400 });
  }

  try {
    await assertWithinRateLimit(user.id, "clusters", 10);
  } catch (error) {
    return rateLimitResponse(error);
  }

  const candidates = papers
    .filter((p) => isOpenAlexWorkId(p.id) && typeof p.title === "string" && p.title.trim())
    .map((p) => ({
      id: p.id,
      title: p.title.trim().slice(0, MAX_TITLE),
      abstract: typeof p.abstract === "string" ? p.abstract.slice(0, MAX_ABSTRACT) : "",
      doi: typeof p.doi === "string" ? p.doi.trim().slice(0, 256) : "",
    }));
  const missingAbstract = candidates.filter((p) => !p.abstract);

  const resolved = {};
  if (missingAbstract.length) {
    // Semantic Scholar's own 1 req/s cap is enforced internally by
    // abstract-fallback.js regardless of this concurrency — this just
    // controls how many papers' Crossref/PDF fallback can be in flight
    // at once.
    await mapPool(missingAbstract, 5, async (p) => {
      const abstract = await resolveAbstractFallback(p.doi, p.id);
      if (abstract) {
        p.abstract = abstract.slice(0, MAX_ABSTRACT);
        resolved[p.id] = p.abstract;
      }
    });
  }

  const usable = candidates.filter((p) => p.abstract);
  const excluded = candidates.filter((p) => !p.abstract).map((p) => ({ id: p.id, title: p.title }));

  if (usable.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 papers with abstracts to cluster" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  let vectorsById;
  try {
    vectorsById = await getEmbeddings(admin, usable);
  } catch (err) {
    console.error("Embeddings request failed:", err.status || "error");
    return NextResponse.json({ error: "Embedding generation failed" }, { status: 502 });
  }

  const ids = usable.filter((p) => vectorsById.has(p.id)).map((p) => p.id);
  const vectors = ids.map((id) => vectorsById.get(id));

  if (ids.length < 2) {
    return NextResponse.json(
      { error: "Not enough embeddings succeeded to cluster" },
      { status: 502 }
    );
  }

  const k = Math.max(1, Math.min(clusterCount || 5, vectors.length));
  const clusters = clusterVectors(vectors, k);
  const positions = projectTo2D(vectors);

  const points = ids.map((id, i) => ({
    id,
    x: positions[i][0],
    y: positions[i][1],
    cluster: clusters[i],
  }));

  return NextResponse.json({ points, excluded, resolved });
}
