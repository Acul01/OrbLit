import { NextResponse } from "next/server";
import { isLocalMode } from "@/lib/mode";
import { deleteLocalProject, getLocalProjectData, updateLocalProject } from "@/lib/local-store";

function unavailable() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(_request, { params }) {
  if (!isLocalMode()) return unavailable();
  try {
    const { id } = await params;
    const data = await getLocalProjectData(id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    const status = error?.status === 400 ? 400 : 500;
    return NextResponse.json({ error: "Invalid request" }, { status });
  }
}

export async function PATCH(request, { params }) {
  if (!isLocalMode()) return unavailable();
  try {
    const { id } = await params;
    const text = await request.text();
    if (text.length > 20_000_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    const updated = await updateLocalProject(id, body || {});
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const status = error?.status === 400 ? 400 : 500;
    return NextResponse.json({ error: "Invalid request" }, { status });
  }
}

export async function DELETE(_request, { params }) {
  if (!isLocalMode()) return unavailable();
  try {
    const { id } = await params;
    await deleteLocalProject(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const status = error?.status === 400 ? 400 : 500;
    return NextResponse.json({ error: "Invalid request" }, { status });
  }
}
