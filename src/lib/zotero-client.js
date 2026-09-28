// Isomorphic Zotero API helpers — plain fetch() calls with no framework
// dependency, so they work from both server code (app/api/zotero/*, which
// holds the decrypted API key) and, historically, the browser. As of
// phase 6 only the server-side routes call these; the client
// (OrbLitApp.jsx / useZoteroSync) talks to /api/zotero/* instead and
// never sees a Zotero API key.
import crypto from "crypto";

export const ZOTERO_API = "https://api.zotero.org";

export async function fetchZoteroCollections(userId, apiKey) {
  const res = await fetch(`${ZOTERO_API}/users/${userId}/collections?limit=200`, {
    headers: { "Zotero-API-Key": apiKey },
  });
  if (!res.ok) throw new Error("Connection failed");
  const collections = await res.json();
  return (collections || [])
    .map((c) => ({ key: c.key, name: c.data.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchAllZoteroItems(userId, apiKey, collectionKey) {
  const headers = { "Zotero-API-Key": apiKey };
  const base = collectionKey
    ? `${ZOTERO_API}/users/${userId}/collections/${collectionKey}/items/top`
    : `${ZOTERO_API}/users/${userId}/items/top`;
  const all = [];
  let start = 0;
  while (true) {
    const res = await fetch(`${base}?limit=100&start=${start}`, { headers });
    if (!res.ok) throw new Error("Failed to fetch Zotero items");
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
    start += 100;
  }
  return all.filter(
    (it) => it.data && !["attachment", "note", "annotation"].includes(it.data.itemType)
  );
}

export async function createZoteroCollection(userId, apiKey, name) {
  const res = await fetch(`${ZOTERO_API}/users/${userId}/collections`, {
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
  const template = await (
    await fetch(`${ZOTERO_API}/items/new?itemType=journalArticle`)
  ).json();

  const payload = { ...template, ...item };
  if (collectionKey) payload.collections = [collectionKey];

  const res = await fetch(`${ZOTERO_API}/users/${userId}/items`, {
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
 *  as a real stored file attachment (not just a link) — follows Zotero's
 *  three-step file upload flow: register upload intent, PUT the bytes to
 *  the returned storage URL, then confirm registration. Every step is
 *  wrapped so a failure anywhere (no PDF at the URL, quota exceeded,
 *  network hiccup) just means "not attached" rather than breaking the
 *  metadata-only item that was already created successfully.
 *  Returns { attached: boolean, reason?: string }. */
export async function attachPdfToZotero(userId, apiKey, parentItemKey, pdfUrl) {
  let buffer;
  try {
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) return { attached: false, reason: "download_failed" };
    const contentType = pdfRes.headers.get("content-type") || "";
    buffer = Buffer.from(await pdfRes.arrayBuffer());
    const looksLikePdf =
      contentType.includes("pdf") || buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    if (!looksLikePdf) return { attached: false, reason: "not_a_pdf" };
  } catch {
    return { attached: false, reason: "download_failed" };
  }

  const filename = "attachment.pdf";
  const md5 = crypto.createHash("md5").update(buffer).digest("hex");
  const mtime = Date.now();
  console.log(
    "[zotero pdf] downloaded:",
    pdfUrl,
    "bytes:",
    buffer.length,
    "md5:",
    md5
  );

  // Step 1: create the attachment item. md5/mtime are deliberately left
  // off here — setting them at creation time (before any bytes exist on
  // Zotero's storage) can make the server believe a matching file is
  // already attached, short-circuiting the real upload in step 2.
  let attachmentKey;
  let attachmentVersion;
  try {
    const createRes = await fetch(`${ZOTERO_API}/users/${userId}/items`, {
      method: "POST",
      headers: { "Zotero-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          itemType: "attachment",
          parentItem: parentItemKey,
          linkMode: "imported_file",
          title: filename,
          filename,
          contentType: "application/pdf",
        },
      ]),
    });
    const createBodyText = await createRes.text();
    console.log(
      "[zotero pdf] step1 create attachment:",
      createRes.status,
      createBodyText.slice(0, 500)
    );
    const createResult = JSON.parse(createBodyText);
    const created = createResult.successful?.["0"];
    attachmentKey = created?.key;
    attachmentVersion = created?.version;
    if (!attachmentKey) return { attached: false, reason: "attachment_create_failed" };
  } catch (e) {
    console.log("[zotero pdf] step1 threw:", e?.message);
    return { attached: false, reason: "attachment_create_failed" };
  }

  // Step 2: request upload authorization for that attachment. Brand new
  // attachment with no file yet -> If-None-Match: *.
  let auth;
  try {
    const authRes = await fetch(
      `${ZOTERO_API}/users/${userId}/items/${attachmentKey}/file`,
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
    const authBodyText = await authRes.text();
    console.log(
      "[zotero pdf] step2 upload auth:",
      authRes.status,
      authBodyText.slice(0, 800)
    );
    auth = JSON.parse(authBodyText);
  } catch (e) {
    console.log("[zotero pdf] step2 threw:", e?.message);
    return { attached: false, reason: "upload_auth_failed" };
  }
  if (auth.exists) return { attached: true }; // identical file already on Zotero's storage
  if (!auth.url) return { attached: false, reason: "upload_auth_failed" };

  // Step 3: upload the raw bytes, sandwiched between Zotero's given
  // multipart prefix/suffix — Zotero pre-builds the multipart envelope
  // server-side, so the client just concatenates around the file content.
  try {
    const body = Buffer.concat([
      Buffer.from(auth.prefix, "binary"),
      buffer,
      Buffer.from(auth.suffix, "binary"),
    ]);
    const uploadRes = await fetch(auth.url, {
      method: "POST",
      headers: { "Content-Type": auth.contentType },
      body,
    });
    const uploadBodyText = await uploadRes.text().catch(() => "");
    console.log(
      "[zotero pdf] step3 upload bytes:",
      uploadRes.status,
      uploadBodyText.slice(0, 500)
    );
    if (!uploadRes.ok) return { attached: false, reason: "upload_failed" };
  } catch (e) {
    console.log("[zotero pdf] step3 threw:", e?.message);
    return { attached: false, reason: "upload_failed" };
  }

  // Step 4: register the completed upload. Use the attachment's version
  // from step 1 (If-Match) rather than If-None-Match: * — the item may
  // already be considered to have a "version" after creation, and the
  // register call needs to reference the right one for Zotero to accept
  // it as completing this specific upload's registration.
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
      `${ZOTERO_API}/users/${userId}/items/${attachmentKey}/file`,
      {
        method: "POST",
        headers: registerHeaders,
        body: new URLSearchParams({ upload: auth.uploadKey }),
      }
    );
    const registerBodyText = await registerRes.text().catch(() => "");
    console.log(
      "[zotero pdf] step4 register:",
      registerRes.status,
      registerBodyText.slice(0, 500)
    );
    if (!registerRes.ok) return { attached: false, reason: "register_failed" };
  } catch (e) {
    console.log("[zotero pdf] step4 threw:", e?.message);
    return { attached: false, reason: "register_failed" };
  }

  return { attached: true };
}
