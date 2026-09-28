// Shared, rate-limited fetch for every Semantic Scholar call in the app
// (Paper Details in abstract-fallback.js, Recommendations in
// recommendations.js). The approved API key's limit is "1 request per
// second, cumulative across all endpoints" — a single shared queue is
// what actually enforces that; two independently-throttled callers could
// each stay under 1/s on their own and still jointly blow the real,
// cumulative limit.
const S2_MIN_GAP_MS = 1100;
let s2Queue = Promise.resolve();

export function s2Fetch(url, options) {
  const run = s2Queue.then(async () => {
    const headers = { ...(options?.headers || {}) };
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
    }
    const res = await fetch(url, { ...options, headers });
    await new Promise((resolve) => setTimeout(resolve, S2_MIN_GAP_MS));
    return res;
  });
  // Keep the queue alive even if this particular call fails.
  s2Queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
