import { kmeans } from "ml-kmeans";
import { UMAP } from "umap-js";

/** k-means over the embedding vectors, returning a cluster index (0-based)
 *  per input vector in the same order. */
export function clusterVectors(vectors, clusterCount) {
  const k = Math.max(1, Math.min(clusterCount, vectors.length));
  if (vectors.length === 1) return [0];
  const result = kmeans(vectors, k, { seed: 42 });
  return result.clusters;
}

/** Projects the (high-dimensional) embedding vectors down to 2D for the
 *  scatter-plot map. UMAP's nNeighbors must be smaller than the number of
 *  points, so it's capped for small collections. Falls back to a trivial
 *  layout for tiny inputs where UMAP isn't meaningful anyway. */
export function projectTo2D(vectors) {
  const n = vectors.length;
  if (n <= 1) return vectors.map(() => [0, 0]);
  if (n === 2) return [[0, 0], [1, 0]];

  const nNeighbors = Math.max(2, Math.min(15, n - 1));
  const umap = new UMAP({ nNeighbors, nComponents: 2, minDist: 0.1 });
  return umap.fit(vectors);
}
