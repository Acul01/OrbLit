import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddings } from "@/lib/embeddings";
import { clusterVectors, projectTo2D } from "@/lib/clustering";
import { resolveAbstractFallback } from "@/lib/abstract-fallback";
import { mapPool } from "@/lib/citation-graph";

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

  const { papers, clusterCount } = await request.json().catch(() => ({}));
  if (!Array.isArray(papers)) {
    return NextResponse.json({ error: "Missing papers" }, { status: 400 });
  }

  const candidates = papers.filter((p) => p.id && p.title);
  // Every candidate has an OpenAlex id, so every one of them is at least
  // eligible for the PDF-extraction last resort (which only needs the id,
  // not a DOI) — resolveAbstractFallback itself skips the DOI-only steps
  // when there's no DOI.
  const missingAbstract = candidates.filter((p) => !p.abstract);
  console.log(
    `[clusters] ${missingAbstract.length} missing abstract, ${missingAbstract.filter((p) => p.doi).length} have a DOI to try`
  );

  const resolved = {};
  if (missingAbstract.length) {
    // Semantic Scholar's own 1 req/s cap is enforced internally by
    // abstract-fallback.js regardless of this concurrency — this just
    // controls how many papers' Crossref/PDF fallback can be in flight
    // at once.
    await mapPool(missingAbstract, 5, async (p) => {
      const abstract = await resolveAbstractFallback(p.doi, p.id);
      if (abstract) {
        p.abstract = abstract;
        resolved[p.id] = abstract;
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
    console.error("Embeddings request failed:", err.message);
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
