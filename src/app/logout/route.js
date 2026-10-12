import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";

export async function POST(request) {
  if (isLocalMode()) return NextResponse.redirect(new URL("/", request.url));
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  return NextResponse.redirect(new URL("/", request.url));
}
