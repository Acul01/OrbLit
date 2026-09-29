import { NextResponse } from "next/server";

export const MAX_JSON_BYTES = 1_000_000;

export function jsonTooLarge(request) {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const size = Number(raw);
  return Number.isFinite(size) && size > MAX_JSON_BYTES;
}

export function payloadTooLarge() {
  return NextResponse.json({ error: "Payload too large" }, { status: 413 });
}

/** Reads a JSON body, rejecting anything over 1 MB even when Content-Length
 *  is missing. Invalid JSON becomes `{}` so callers keep their existing
 *  field checks. */
export async function readJson(request) {
  if (jsonTooLarge(request)) {
    const error = new Error("Payload too large");
    error.status = 413;
    throw error;
  }
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) {
    const error = new Error("Payload too large");
    error.status = 413;
    throw error;
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function bodyErrorResponse(error, fallbackStatus = 400) {
  if (error?.status === 413) return payloadTooLarge();
  return NextResponse.json({ error: "Invalid request" }, { status: fallbackStatus });
}
