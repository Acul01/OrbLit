// Local runs set ORBLIT_MODE=local in .env.local. The hosted app never
// sets it, so every check below stays on the Supabase path.
export function isLocalMode() {
  return process.env.ORBLIT_MODE === "local";
}
