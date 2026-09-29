// Title+abstract embeddings for the thematic-cluster map. Papers without
// an abstract are excluded before this ever runs (nothing to embed) — see
// api/clusters/route.js.
import crypto from "node:crypto";

const OPENAI_API = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100; // comfortably under OpenAI's per-request item limit

/** Splits `arr` into chunks of at most `size`. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function embeddingInput(paper) {
  return `${paper.title}. ${paper.abstract}`.slice(0, 8000);
}

function contentHash(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/** Returns a Map<work_id, number[]> for the given papers, using the
 *  Supabase `paper_embeddings` cache where possible and calling OpenAI
 *  only for the ones actually missing. The cache key includes a hash of
 *  the embedded text, so a caller cannot overwrite the vector stored for
 *  a different abstract under the same work id. `admin` is a service-role
 *  Supabase client (this table has no client-facing RLS policies). */
export async function getEmbeddings(admin, papers) {
  const prepared = papers.map((paper) => {
    const text = embeddingInput(paper);
    return { paper, text, hash: contentHash(text) };
  });
  const ids = prepared.map((row) => row.paper.id);
  const vectors = new Map();

  const { data: cached } = await admin
    .from("paper_embeddings")
    .select("work_id, content_hash, embedding")
    .in("work_id", ids)
    .eq("model", MODEL);

  const wanted = new Map(prepared.map((row) => [row.paper.id, row.hash]));
  for (const row of cached || []) {
    if (row.content_hash && row.content_hash === wanted.get(row.work_id)) {
      vectors.set(row.work_id, row.embedding);
    }
  }

  const missing = prepared.filter((row) => !vectors.has(row.paper.id));
  if (missing.length === 0) return vectors;

  for (const batch of chunk(missing, BATCH_SIZE)) {
    const input = batch.map((row) => row.text);

    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input }),
    });
    if (!res.ok) {
      const error = new Error("OpenAI embeddings request failed");
      error.status = res.status;
      throw error;
    }
    const json = await res.json();

    const rowsToCache = [];
    json.data.forEach((item, i) => {
      const row = batch[i];
      vectors.set(row.paper.id, item.embedding);
      rowsToCache.push({
        work_id: row.paper.id,
        model: MODEL,
        content_hash: row.hash,
        embedding: item.embedding,
      });
    });

    // Best-effort cache write — a failure here shouldn't break the
    // request, it just means we re-embed this paper next time.
    await admin
      .from("paper_embeddings")
      .upsert(rowsToCache, { onConflict: "work_id,model,content_hash" });
  }

  return vectors;
}
