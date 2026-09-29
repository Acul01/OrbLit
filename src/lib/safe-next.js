// Post-login destinations we are willing to send a browser to.
// Optional `/de` prefix matches localePrefix: "as-needed".
const ALLOWED_NEXT = /^\/(?:de\/)?(?:app|account|reset-password)\/?$/;

export function safeNextPath(raw) {
  if (typeof raw !== "string") return "/app";
  const path = raw.split("?")[0].split("#")[0];
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    return "/app";
  }
  if (!ALLOWED_NEXT.test(path)) return "/app";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}
