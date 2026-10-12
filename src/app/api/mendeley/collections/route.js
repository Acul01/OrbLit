import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMendeleyFolder, fetchMendeleyFolders } from "@/lib/mendeley-client";
import { getMendeleyAccess, mendeleyErrorResponse } from "@/lib/mendeley-server";
import { readJson } from "@/lib/request-body";
import { assertWithinRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let access;
  try {
    access = await getMendeleyAccess(user.id);
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to fetch folders");
  }
  if (!access) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  try {
    await assertWithinRateLimit(user.id, "mendeley_collections", 60);
    const collections = await fetchMendeleyFolders(access.accessToken);
    return NextResponse.json({ collections });
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to fetch folders");
  }
}

// POST { name } — creates a folder, used when a map starts from one paper.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let access;
  try {
    access = await getMendeleyAccess(user.id);
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to create folder");
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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
  }

  try {
    await assertWithinRateLimit(user.id, "mendeley_collections", 60);
    const collection = await createMendeleyFolder(access.accessToken, name);
    return NextResponse.json({ collection });
  } catch (error) {
    return mendeleyErrorResponse(error, "Failed to create folder");
  }
}
