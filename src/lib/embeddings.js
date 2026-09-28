// Title+abstract embeddings for the thematic-cluster map. Papers without
// an abstract are excluded before this ever runs (nothing to embed) — see
// api/clusters/route.js.
const OPENAI_API = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100; // comfortably under OpenAI's per-request item limit

/** Splits `arr` into chunks of at most `size`. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Returns a Map<work_id, number[]> for the given papers, using the
 *  Supabase `paper_embeddings` cache where possible and calling OpenAI
 *  only for the ones actually missing. `admin` is a service-role Supabase
 *  client (this table has no client-facing RLS policies). */
export async function getEmbeddings(admin, papers) {
  const ids = papers.map((p) => p.id);
  const vectors = new Map();

  const { data: cached } = await admin
    .from("paper_embeddings")
    .select("work_id, embedding")
    .in("work_id", ids)
    .eq("model", MODEL);

  for (const row of cached || []) {
    vectors.set(row.work_id, row.embedding);
  }

  const missing = papers.filter((p) => !vectors.has(p.id));
  if (missing.length === 0) return vectors;

  for (const batch of chunk(missing, BATCH_SIZE)) {
    const input = batch.map((p) => `${p.title}. ${p.abstract}`.slice(0, 8000));

    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings request failed: ${res.status} ${errText.slice(0, 300)}`);
    }
    const json = await res.json();

    const rowsToCache = [];
    json.data.forEach((item, i) => {
      const paper = batch[i];
      vectors.set(paper.id, item.embedding);
      rowsToCache.push({ work_id: paper.id, model: MODEL, embedding: item.embedding });
    });

    // Best-effort cache write — a failure here shouldn't break the
    // request, it just means we re-embed this paper next time.
    await admin.from("paper_embeddings").upsert(rowsToCache, { onConflict: "work_id" });
  }

  return vectors;
}
