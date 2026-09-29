import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getZoteroCredentials } from "@/lib/zotero-server";
import {
  fetchAllZoteroItems,
  createZoteroItem,
  attachPdfToZotero,
} from "@/lib/zotero-client";
import {
  splitName,
  reconstructAbstract,
  normalizeDoi,
} from "@/lib/citation-graph";
import { fetchOpenAlexPdfUrl, isOpenAlexWorkId } from "@/lib/openalex";
import { readJson } from "@/lib/request-body";
import { assertWithinRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// GET ?collectionKey=... — full (paginated) item list for DOI sync /
// collection-map building. collectionKey omitted or "" = main library.
export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const creds = await getZoteroCredentials(user.id);
  if (!creds) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  const collectionKey = new URL(request.url).searchParams.get("collectionKey") || null;

  try {
    await assertWithinRateLimit(user.id, "zotero_items", 60);
    const { items, truncated } = await fetchAllZoteroItems(
      creds.zoteroUserId,
      creds.apiKey,
      collectionKey
    );
    return NextResponse.json({ items, truncated });
  } catch (error) {
    if (error?.status === 429 || error?.status === 503) return rateLimitResponse(error);
    if (error?.code === "ZOTERO_INPUT") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 502 });
  }
}

// POST { node, collectionKey } — creates a journalArticle in the user's
// Zotero library from an OpenAlex work node (same mapping addToZotero used
// to do client-side), then — if OpenAlex reports an open-access PDF for
// the work — downloads it and attaches it as a real file on the new item.
// A missing/failed PDF never fails the request: the metadata item is the
// important part, the PDF is a best-effort bonus.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const creds = await getZoteroCredentials(user.id);
  if (!creds) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error?.status === 413) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { node, collectionKey } = body;
  if (!node?.label || !isOpenAlexWorkId(node.id)) {
    return NextResponse.json({ error: "Missing paper data" }, { status: 400 });
  }

  try {
    await assertWithinRateLimit(user.id, "zotero_items", 60);
  } catch (error) {
    return rateLimitResponse(error);
  }

  const item = {
    title: String(node.label).slice(0, 500),
    creators: (Array.isArray(node.authorships) ? node.authorships : []).map((a) =>
      splitName(a.author && a.author.display_name)
    ),
    date: String(node.year || ""),
    DOI: normalizeDoi(node.doi) || "",
    url: `https://openalex.org/${node.id}`,
    publicationTitle:
      (node.primary_location && node.primary_location.source && node.primary_location.source.display_name) || "",
    abstractNote: (reconstructAbstract(node.abstract_inverted_index) || "").slice(0, 8000),
  };

  let result;
  try {
    result = await createZoteroItem(
      creds.zoteroUserId,
      creds.apiKey,
      item,
      collectionKey || null
    );
  } catch (error) {
    if (error?.code === "ZOTERO_INPUT") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add item" }, { status: 502 });
  }

  const itemKey = result.successful?.["0"]?.key;
  // The browser used to send oaPdfUrl. The server resolves it from OpenAlex
  // for this work id so a client cannot choose the URL we download.
  const pdfUrl = await fetchOpenAlexPdfUrl(node.id);

  if (itemKey && pdfUrl) {
    const pdfResult = await attachPdfToZotero(creds.zoteroUserId, creds.apiKey, itemKey, pdfUrl);
    return NextResponse.json({ ...result, pdfAttached: pdfResult.attached, pdfReason: pdfResult.reason });
  }

  return NextResponse.json({ ...result, pdfAttached: false, pdfReason: "no_oa_pdf" });
}
