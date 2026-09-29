import { createAdminClient } from "@/lib/supabase/admin";

// Hourly counters in `api_rate_limits`, incremented by the
// `bump_api_rate_limit` database function (migration 0008). A process-local
// counter would reset on every serverless isolate, so the count lives in
// Postgres. Fails closed: if the counter cannot be updated, the request
// does not proceed.
export async function assertWithinRateLimit(userId, route, limit) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bump_api_rate_limit", {
    p_user: userId,
    p_route: route,
    p_limit: limit,
  });
  if (error || data !== true) {
    const denied = new Error("Too many requests");
    denied.status = error ? 503 : 429;
    throw denied;
  }
}

export function rateLimitResponse(error) {
  const status = error?.status === 429 ? 429 : 503;
  const message = status === 429 ? "Too many requests" : "Please try again later";
  return Response.json({ error: message }, { status });
}
