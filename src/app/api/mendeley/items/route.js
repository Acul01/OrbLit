import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import {
  attachPdfToMendeley,
  createMendeleyItem,
  fetchMendeleyItems,
} from "@/lib/mendeley-client";
import { getMendeleyAccess, mendeleyErrorResponse } from "@/lib/mendeley-server";
import {
  splitName,
  reconstructAbstract,
  normalizeDoi,
} from "@/lib/citation-graph";
import { fetchOpenAlexPdfUrl, isOpenAlexWorkId } from "@/lib/openalex";
import { readJson } from "@/lib/request-body";
import { assertWithinRateLimit } from "@/lib/rate-limit";

// GET ?collectionKey=... — DOI list for a folder, or the whole library
// when collectionKey is omitted. Same item shape as /api/zotero/items.
export async function GET(request) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let access;
  try {
    access = await getMendeleyAccess(user.id);
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to fetch items");
  }
  if (!access) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  const collectionKey = new URL(request.url).searchParams.get("collectionKey") || null;

  try {
    await assertWithinRateLimit(user.id, "mendeley_items", 60);
    const { items, truncated } = await fetchMendeleyItems(access.accessToken, collectionKey);
    return NextResponse.json({ items, truncated });
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to fetch items");
  }
}

// POST { node, collectionKey } — creates a journal document, puts it in
// the folder when one is selected, then attaches an open-access PDF when
// OpenAlex has one. A missing PDF does not fail the request.
export async function POST(request) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let access;
  try {
    access = await getMendeleyAccess(user.id);
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to add item");
  }
  if (!access) {
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
    await assertWithinRateLimit(user.id, "mendeley_items", 60);
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to add item");
  }

  const item = {
    title: String(node.label).slice(0, 500),
    creators: (Array.isArray(node.authorships) ? node.authorships : []).map((a) =>
      splitName(a.author && a.author.display_name)
    ),
    year: node.year,
    doi: normalizeDoi(node.doi) || "",
    url: `https://openalex.org/${node.id}`,
    source:
      (node.primary_location && node.primary_location.source && node.primary_location.source.display_name) || "",
    abstract: (reconstructAbstract(node.abstract_inverted_index) || "").slice(0, 8000),
  };

  let result;
  try {
    result = await createMendeleyItem(access.accessToken, item, collectionKey || null);
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to add item");
  }

  const itemKey = result.successful?.["0"]?.key;
  const pdfUrl = await fetchOpenAlexPdfUrl(node.id);
  if (itemKey && pdfUrl) {
    const pdfResult = await attachPdfToMendeley(access.accessToken, itemKey, pdfUrl);
    return NextResponse.json({ ...result, pdfAttached: pdfResult.attached, pdfReason: pdfResult.reason });
  }

  return NextResponse.json({ ...result, pdfAttached: false, pdfReason: "no_oa_pdf" });
}
