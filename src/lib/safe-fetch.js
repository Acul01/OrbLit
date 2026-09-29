import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Server-side fetch for URLs that originated outside our process (OpenAlex
// PDF links, and anything else we did not hardcode). HTTPS only, no
// embedded credentials, no loopback/private/link-local targets, and every
// redirect is checked again before it is followed.

export const PDF_MAX_BYTES = 20 * 1024 * 1024;
export const PDF_FETCH_TIMEOUT_MS = 15000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
]);

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain"];

function bareHost(hostname) {
  const host = hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) return host.slice(1, -1);
  return host;
}

function ipv4FromInteger(host) {
  if (!/^\d+$/.test(host)) return null;
  const n = Number(host);
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function isPrivateAddress(raw) {
  const ip = bareHost(raw);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }
  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    const mapped = normalized.match(/(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (normalized.startsWith("ff")) return true;
    return false;
  }
  return false;
}

function assertPublicHostname(hostname) {
  const host = bareHost(hostname);
  if (!host || BLOCKED_HOSTS.has(host) || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new Error("Blocked host");
  }
  const asInteger = ipv4FromInteger(host);
  if (asInteger && isPrivateAddress(asInteger)) throw new Error("Blocked address");
  if (isIP(host) && isPrivateAddress(host)) throw new Error("Blocked address");
}

export function assertPublicHttpsUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "https:") throw new Error("Invalid URL");
  if (url.username || url.password) throw new Error("Invalid URL");
  assertPublicHostname(url.hostname);
  return url;
}

async function assertResolvedAddresses(hostname) {
  const host = bareHost(hostname);
  if (isIP(host)) return;
  let records;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("Blocked host");
  }
  if (!records.length) throw new Error("Blocked host");
  for (const record of records) {
    if (isPrivateAddress(record.address)) throw new Error("Blocked address");
  }
}

/** Downloads `rawUrl` and returns the body, refusing private targets and
 *  re-checking each redirect. Throws if the response is not OK, too large,
 *  or the URL is not allowed. */
export async function safeFetchBuffer(rawUrl, {
  maxBytes = PDF_MAX_BYTES,
  timeoutMs = PDF_FETCH_TIMEOUT_MS,
  maxRedirects = 3,
} = {}) {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = assertPublicHttpsUrl(current);
    await assertResolvedAddresses(url.hostname);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Invalid redirect");
      current = new URL(location, url).href;
      continue;
    }
    if (!res.ok) {
      const error = new Error("Download failed");
      error.status = res.status;
      throw error;
    }
    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > maxBytes) throw new Error("Download too large");
    const reader = res.body?.getReader();
    if (!reader) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > maxBytes) throw new Error("Download too large");
      return { buffer, contentType: res.headers.get("content-type") || "" };
    }
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Download too large");
      }
      chunks.push(Buffer.from(value));
    }
    return {
      buffer: Buffer.concat(chunks),
      contentType: res.headers.get("content-type") || "",
    };
  }
  throw new Error("Too many redirects");
}
