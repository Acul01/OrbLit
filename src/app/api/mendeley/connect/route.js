import crypto from "crypto";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { safeNextPath } from "@/lib/safe-next";
import { mendeleyAuthorizeUrl, mendeleyOAuthConfig, mendeleyRedirectUri } from "@/lib/mendeley-client";
import {
  encodeMendeleyOauthCookie,
  mendeleyOauthCookieName,
  mendeleyOauthCookieOptions,
} from "@/lib/mendeley-server";

// Starts the Mendeley authorization-code flow. The browser only follows
// redirects; the client secret never leaves this route.
export async function GET(request) {
  const url = new URL(request.url);
  const returnTo = safeNextPath(url.searchParams.get("next"));
  const origin = url.origin;

  const user = await getRequestUser();
  if (!user) {
    const login = new URL("/login", origin);
    login.searchParams.set("next", returnTo);
    return NextResponse.redirect(login);
  }

  const config = mendeleyOAuthConfig();
  if (!config) {
    const back = new URL(returnTo, origin);
    back.searchParams.set("mendeley", "not_configured");
    return NextResponse.redirect(back);
  }

  const state = crypto.randomBytes(24).toString("hex");
  const response = NextResponse.redirect(
    mendeleyAuthorizeUrl({
      clientId: config.clientId,
      redirectUri: mendeleyRedirectUri(),
      state,
    })
  );
  response.cookies.set(
    mendeleyOauthCookieName(),
    encodeMendeleyOauthCookie(state, returnTo),
    mendeleyOauthCookieOptions()
  );
  return response;
}
