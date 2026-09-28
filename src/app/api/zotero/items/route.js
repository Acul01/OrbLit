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
    const items = await fetchAllZoteroItems(creds.zoteroUserId, creds.apiKey, collectionKey);
    return NextResponse.json({ items });
  } catch {
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

  const { node, collectionKey } = await request.json().catch(() => ({}));
  if (!node?.label || !node?.id) {
    return NextResponse.json({ error: "Missing paper data" }, { status: 400 });
  }

  const item = {
    title: node.label,
    creators: (node.authorships || []).map((a) => splitName(a.author && a.author.display_name)),
    date: String(node.year || ""),
    DOI: normalizeDoi(node.doi) || "",
    url: `https://openalex.org/${node.id}`,
    publicationTitle:
      (node.primary_location && node.primary_location.source && node.primary_location.source.display_name) || "",
    abstractNote: reconstructAbstract(node.abstract_inverted_index) || "",
  };

  let result;
  try {
    result = await createZoteroItem(
      creds.zoteroUserId,
      creds.apiKey,
      item,
      collectionKey || null
    );
  } catch {
    return NextResponse.json({ error: "Failed to add item" }, { status: 502 });
  }

  const itemKey = result.successful?.["0"]?.key;
  const pdfUrl = node.oaPdfUrl || null;

  if (itemKey && pdfUrl) {
    const pdfResult = await attachPdfToZotero(creds.zoteroUserId, creds.apiKey, itemKey, pdfUrl);
    return NextResponse.json({ ...result, pdfAttached: pdfResult.attached, pdfReason: pdfResult.reason });
  }

  return NextResponse.json({ ...result, pdfAttached: false, pdfReason: "no_oa_pdf" });
}
