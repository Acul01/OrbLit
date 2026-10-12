import { NextResponse } from "next/server";
import { isLocalMode } from "@/lib/mode";
import { createLocalProject, listLocalProjects } from "@/lib/local-store";
import { readJson } from "@/lib/request-body";

function unavailable() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET() {
  if (!isLocalMode()) return unavailable();
  const projects = await listLocalProjects();
  return NextResponse.json(projects);
}

export async function POST(request) {
  if (!isLocalMode()) return unavailable();
  const body = await readJson(request).catch(() => ({}));
  const created = await createLocalProject(body?.name);
  return NextResponse.json(created);
}
