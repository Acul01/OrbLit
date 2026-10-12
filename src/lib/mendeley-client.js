// Server-side Mendeley API helpers. Tokens stay in the route handlers
// and mendeley-server.js; the browser only talks to /api/mendeley/*.
import { safeFetchBuffer } from "@/lib/safe-fetch";

export const MENDELEY_API = "https://api.mendeley.com";

const FOLDER_TYPE = "application/vnd.mendeley-folder.1+json";
const DOCUMENT_TYPE = "application/vnd.mendeley-document.1+json";
const PROFILE_TYPE = "application/vnd.mendeley-profiles.1+json";

const MENDELEY_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_LIMIT = 500;
const MAX_PAGES = 20;

function inputError(message) {
  const error = new Error(message);
  error.code = "MENDELEY_INPUT";
  return error;
}

function apiError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function mendeleyOAuthConfig() {
  const clientId = process.env.MENDELEY_CLIENT_ID?.trim();
  const clientSecret = process.env.MENDELEY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// Mendeley's app form accepts a single redirect URI. Authorize and token
// exchange must send that exact string, not the host the browser happened
// to use (www vs apex, or a preview URL).
export function mendeleyRedirectUri() {
  const explicit = process.env.MENDELEY_REDIRECT_URI?.trim();
  const base = (explicit || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .trim()
    .replace(/\/$/, "");
  if (explicit && /\/api\/mendeley\/callback\/?$/.test(base)) return base;
  return `${base}/api/mendeley/callback`;
}

export function assertMendeleyId(id) {
  const value = String(id || "");
  if (!MENDELEY_ID.test(value)) throw inputError("Invalid Mendeley id");
  return value;
}

function authHeaders(accessToken, accept) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  if (accept) headers.Accept = accept;
  return headers;
}

function basicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function mendeleyAuthorizeUrl({ clientId, redirectUri, state }) {
  const url = new URL(`${MENDELEY_API}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "all");
  url.searchParams.set("state", state);
  return url.toString();
}

async function readTokenResponse(res) {
  if (!res.ok) throw apiError("Mendeley token exchange failed", res.status === 429 ? 429 : 502);
  const data = await res.json();
  if (!data?.access_token) throw apiError("Mendeley token exchange failed", 502);
  return data;
}

export async function exchangeMendeleyCode({ clientId, clientSecret, code, redirectUri }) {
  const res = await fetch(`${MENDELEY_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  return readTokenResponse(res);
}

export async function refreshMendeleyToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(`${MENDELEY_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (res.status === 400 || res.status === 401) {
    const error = apiError("Mendeley session expired", 401);
    error.code = "MENDELEY_REAUTH";
    throw error;
  }
  return readTokenResponse(res);
}

export async function fetchMendeleyProfile(accessToken) {
  const res = await fetch(`${MENDELEY_API}/profiles/me`, {
    headers: authHeaders(accessToken, PROFILE_TYPE),
  });
  if (!res.ok) throw apiError("Failed to read Mendeley profile", res.status === 429 ? 429 : 502);
  const profile = await res.json();
  return { id: typeof profile?.id === "string" ? profile.id : "" };
}

function nextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (!match) continue;
    let url;
    try {
      url = new URL(match[1]);
    } catch {
      return null;
    }
    if (url.origin !== MENDELEY_API) return null;
    return url.toString();
  }
  return null;
}

async function fetchAllPages(accessToken, firstUrl, accept) {
  const items = [];
  let url = firstUrl;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(url, { headers: authHeaders(accessToken, accept) });
    if (res.status === 401) {
      const error = apiError("Mendeley session expired", 401);
      error.code = "MENDELEY_REAUTH";
      throw error;
    }
    if (!res.ok) throw apiError("Mendeley request failed", res.status === 429 ? 429 : 502);
    const batch = await res.json();
    if (!Array.isArray(batch)) throw apiError("Mendeley request failed", 502);
    items.push(...batch);
    const next = nextPageUrl(res.headers.get("link"));
    if (!next || batch.length === 0) return { items, truncated: false };
    url = next;
  }
  return { items, truncated: true };
}

export async function fetchMendeleyFolders(accessToken) {
  const { items } = await fetchAllPages(
    accessToken,
    `${MENDELEY_API}/folders?limit=${PAGE_LIMIT}`,
    FOLDER_TYPE
  );
  return items
    .filter((folder) => folder?.id && folder?.name)
    .map((folder) => ({ key: folder.id, name: folder.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Folder membership is a separate id list. DOIs live on the library
// documents, so a folder read intersects the two.
export async function fetchMendeleyItems(accessToken, folderId) {
  const folder = folderId ? assertMendeleyId(folderId) : null;
  const library = await fetchAllPages(
    accessToken,
    `${MENDELEY_API}/documents?limit=${PAGE_LIMIT}&view=all`,
    DOCUMENT_TYPE
  );
  let docs = library.items;
  let truncated = library.truncated;
  if (folder) {
    const membership = await fetchAllPages(
      accessToken,
      `${MENDELEY_API}/folders/${encodeURIComponent(folder)}/documents?limit=${PAGE_LIMIT}`,
      DOCUMENT_TYPE
    );
    const ids = new Set(membership.items.map((row) => row?.id).filter(Boolean));
    docs = docs.filter((doc) => ids.has(doc.id));
    truncated = truncated || membership.truncated;
  }
  return {
    items: docs.map((doc) => ({ data: { DOI: doc?.identifiers?.doi || "" } })),
    truncated,
  };
}

export async function createMendeleyFolder(accessToken, name) {
  const res = await fetch(`${MENDELEY_API}/folders`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken, FOLDER_TYPE),
      "Content-Type": FOLDER_TYPE,
    },
    body: JSON.stringify({ name: String(name).slice(0, 200) }),
  });
  if (!res.ok) throw apiError("Failed to create Mendeley folder", res.status === 429 ? 429 : 502);
  const created = await res.json();
  if (!created?.id) throw apiError("Failed to create Mendeley folder", 502);
  return { key: created.id, name: created.name || name };
}

function mendeleyAuthors(creators) {
  return (Array.isArray(creators) ? creators : [])
    .map((creator) => {
      if (creator?.lastName) {
        return {
          first_name: String(creator.firstName || "").slice(0, 255),
          last_name: String(creator.lastName).slice(0, 255),
        };
      }
      const name = String(creator?.name || "").trim();
      if (!name) return null;
      return { last_name: name.slice(0, 255) };
    })
    .filter(Boolean);
}

export async function createMendeleyItem(accessToken, item, folderId) {
  const folder = folderId ? assertMendeleyId(folderId) : null;
  const year = Number(item.year);
  const authors = mendeleyAuthors(item.creators);
  const payload = {
    type: "journal",
    title: String(item.title || "Untitled").slice(0, 500),
  };
  if (authors.length) payload.authors = authors;
  if (Number.isInteger(year) && year > 0) payload.year = year;
  if (item.doi) payload.identifiers = { doi: String(item.doi).slice(0, 500) };
  if (item.source) payload.source = String(item.source).slice(0, 255);
  if (item.abstract) payload.abstract = String(item.abstract).slice(0, 10000);
  if (item.url) payload.websites = [String(item.url).slice(0, 2000)];

  const res = await fetch(`${MENDELEY_API}/documents`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken, DOCUMENT_TYPE),
      "Content-Type": DOCUMENT_TYPE,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw apiError("Failed to create Mendeley document", res.status === 429 ? 429 : 502);
  const created = await res.json();
  if (!created?.id) throw apiError("Failed to create Mendeley document", 502);

  if (folder) {
    const link = await fetch(
      `${MENDELEY_API}/folders/${encodeURIComponent(folder)}/documents`,
      {
        method: "POST",
        headers: {
          ...authHeaders(accessToken, DOCUMENT_TYPE),
          "Content-Type": DOCUMENT_TYPE,
        },
        body: JSON.stringify({ id: created.id }),
      }
    );
    if (!link.ok) throw apiError("Failed to add document to folder", link.status === 429 ? 429 : 502);
  }

  return { successful: { "0": { key: created.id } } };
}

/** Downloads an open-access PDF and attaches it to an existing Mendeley
 *  document. A failure means "not attached"; the document is left in place.
 *  Returns { attached: boolean, reason?: string }. */
export async function attachPdfToMendeley(accessToken, documentId, pdfUrl) {
  const id = assertMendeleyId(documentId);
  let buffer;
  try {
    const downloaded = await safeFetchBuffer(pdfUrl);
    const looksLikePdf =
      downloaded.contentType.includes("pdf") ||
      downloaded.buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    if (!looksLikePdf) return { attached: false, reason: "not_a_pdf" };
    buffer = downloaded.buffer;
  } catch {
    return { attached: false, reason: "download_failed" };
  }

  try {
    const res = await fetch(`${MENDELEY_API}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="attachment.pdf"',
        Link: `<${MENDELEY_API}/documents/${id}>; rel="document"`,
      },
      body: buffer,
    });
    if (!res.ok) return { attached: false, reason: "upload_failed" };
  } catch {
    return { attached: false, reason: "upload_failed" };
  }
  return { attached: true };
}
