// Server-side Zotero API helpers. The decrypted API key stays in the route
// handlers that call these; the browser only talks to /api/zotero/*.
import crypto from "crypto";
import { safeFetchBuffer } from "@/lib/safe-fetch";

export const ZOTERO_API = "https://api.zotero.org";

// Zotero object keys are 8 characters from this alphabet (no 0, 1, O, I).
const ZOTERO_KEY = /^[23456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{8}$/;
const ZOTERO_USER_ID = /^\d{1,12}$/;
const MAX_ITEM_PAGES = 100;

function inputError(message) {
  const error = new Error(message);
  error.code = "ZOTERO_INPUT";
  return error;
}

export function assertZoteroUserId(userId) {
  const id = String(userId || "");
  if (!ZOTERO_USER_ID.test(id)) throw inputError("Invalid Zotero user id");
  return id;
}

export function assertZoteroKey(key) {
  if (typeof key !== "string" || !ZOTERO_KEY.test(key)) throw inputError("Invalid Zotero key");
  return key;
}

function userBase(userId) {
  return `${ZOTERO_API}/users/${encodeURIComponent(assertZoteroUserId(userId))}`;
}

export async function fetchZoteroCollections(userId, apiKey) {
  const res = await fetch(`${userBase(userId)}/collections?limit=200`, {
    headers: { "Zotero-API-Key": apiKey },
  });
  if (!res.ok) throw new Error("Connection failed");
  const collections = await res.json();
  return (collections || [])
    .map((c) => ({ key: c.key, name: c.data.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function visibleItems(batch) {
  return batch.filter(
    (it) => it.data && !["attachment", "note", "annotation"].includes(it.data.itemType)
  );
}

export async function fetchAllZoteroItems(userId, apiKey, collectionKey) {
  const headers = { "Zotero-API-Key": apiKey };
  const collection = collectionKey ? assertZoteroKey(collectionKey) : null;
  const base = collection
    ? `${userBase(userId)}/collections/${encodeURIComponent(collection)}/items/top`
    : `${userBase(userId)}/items/top`;
  const all = [];
  let start = 0;
  for (let page = 0; page < MAX_ITEM_PAGES; page++) {
    const res = await fetch(`${base}?limit=100&start=${start}`, { headers });
    if (!res.ok) throw new Error("Failed to fetch Zotero items");
    const batch = await res.json();
    if (!Array.isArray(batch)) throw new Error("Failed to fetch Zotero items");
    all.push(...visibleItems(batch));
    if (batch.length < 100) {
      return { items: all, truncated: false };
    }
    start += 100;
  }
  return { items: all, truncated: true };
}

export async function createZoteroCollection(userId, apiKey, name) {
  const res = await fetch(`${userBase(userId)}/collections`, {
    method: "POST",
    headers: {
      "Zotero-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ name }]),
  });
  const result = await res.json();
  const created = result.successful && result.successful["0"];
  if (!created) {
    throw new Error("Failed to create Zotero collection");
  }
  return { key: created.key, name: created.data.name };
}

export async function createZoteroItem(userId, apiKey, item, collectionKey) {
  const collection = collectionKey ? assertZoteroKey(collectionKey) : null;
  const template = await (
    await fetch(`${ZOTERO_API}/items/new?itemType=journalArticle`)
  ).json();

  const payload = { ...template, ...item };
  if (collection) payload.collections = [collection];

  const res = await fetch(`${userBase(userId)}/items`, {
    method: "POST",
    headers: {
      "Zotero-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([payload]),
  });
  return res.json();
}

/** Downloads an open-access PDF and attaches it to an existing Zotero item
 *  as a real stored file attachment (not just a link). The PDF URL must
 *  already have been chosen by the server (OpenAlex), and the download
 *  goes through safeFetchBuffer. A failure anywhere means "not attached";
 *  the metadata item created before this is left in place.
 *  Returns { attached: boolean, reason?: string }. */
export async function attachPdfToZotero(userId, apiKey, parentItemKey, pdfUrl) {
  const parentKey = assertZoteroKey(parentItemKey);
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

  const filename = "attachment.pdf";
  const md5 = crypto.createHash("md5").update(buffer).digest("hex");
  const mtime = Date.now();

  let attachmentKey;
  let attachmentVersion;
  try {
    const createRes = await fetch(`${userBase(userId)}/items`, {
      method: "POST",
      headers: { "Zotero-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          itemType: "attachment",
          parentItem: parentKey,
          linkMode: "imported_file",
          title: filename,
          filename,
          contentType: "application/pdf",
        },
      ]),
    });
    const createResult = await createRes.json();
    const created = createResult.successful?.["0"];
    attachmentKey = created?.key;
    attachmentVersion = created?.version;
    if (!attachmentKey) return { attached: false, reason: "attachment_create_failed" };
  } catch {
    return { attached: false, reason: "attachment_create_failed" };
  }

  let auth;
  try {
    const authRes = await fetch(
      `${userBase(userId)}/items/${encodeURIComponent(attachmentKey)}/file`,
      {
        method: "POST",
        headers: {
          "Zotero-API-Key": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          "If-None-Match": "*",
        },
        body: new URLSearchParams({
          md5,
          filename,
          filesize: String(buffer.length),
          mtime: String(mtime),
        }),
      }
    );
    auth = await authRes.json();
  } catch {
    return { attached: false, reason: "upload_auth_failed" };
  }
  if (auth.exists) return { attached: true };
  if (!auth.url || typeof auth.url !== "string") return { attached: false, reason: "upload_auth_failed" };

  try {
    const uploadUrl = new URL(auth.url);
    if (uploadUrl.protocol !== "https:") return { attached: false, reason: "upload_failed" };
    const body = Buffer.concat([
      Buffer.from(auth.prefix, "binary"),
      buffer,
      Buffer.from(auth.suffix, "binary"),
    ]);
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": auth.contentType },
      body,
    });
    if (!uploadRes.ok) return { attached: false, reason: "upload_failed" };
  } catch {
    return { attached: false, reason: "upload_failed" };
  }

  try {
    const registerHeaders = {
      "Zotero-API-Key": apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (attachmentVersion !== undefined) {
      registerHeaders["If-Match"] = String(attachmentVersion);
    } else {
      registerHeaders["If-None-Match"] = "*";
    }
    const registerRes = await fetch(
      `${userBase(userId)}/items/${encodeURIComponent(attachmentKey)}/file`,
      {
        method: "POST",
        headers: registerHeaders,
        body: new URLSearchParams({ upload: auth.uploadKey }),
      }
    );
    if (!registerRes.ok) return { attached: false, reason: "register_failed" };
  } catch {
    return { attached: false, reason: "register_failed" };
  }

  return { attached: true };
}
