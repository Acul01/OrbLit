import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getZoteroCredentials } from "@/lib/zotero-server";
import { fetchZoteroCollections, createZoteroCollection } from "@/lib/zotero-client";
import { readJson } from "@/lib/request-body";
import { assertWithinRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Re-fetches the collection list using the stored (encrypted) credentials —
// used to restore the UI on page load without asking the user to re-enter
// their API key every session.
export async function GET() {
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

  try {
    await assertWithinRateLimit(user.id, "zotero_collections", 60);
    const collections = await fetchZoteroCollections(creds.zoteroUserId, creds.apiKey);
    return NextResponse.json({ collections });
  } catch (error) {
    if (error?.status === 429 || error?.status === 503) return rateLimitResponse(error);
    if (error?.code === "ZOTERO_INPUT") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 502 });
  }
}

// POST { name } — creates a new Zotero collection (used by the "start a
// map from a single paper" flow: a fresh collection is created to hold
// just that one paper, so the map still behaves like any other
// Zotero-backed collection map afterwards, including Synchronize).
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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
  }

  try {
    await assertWithinRateLimit(user.id, "zotero_collections", 60);
    const collection = await createZoteroCollection(creds.zoteroUserId, creds.apiKey, name);
    return NextResponse.json({ collection });
  } catch (error) {
    if (error?.status === 429 || error?.status === 503) return rateLimitResponse(error);
    if (error?.code === "ZOTERO_INPUT") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create collection" }, { status: 502 });
  }
}
