import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequestUser } from "@/lib/request-user";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import {
  exchangeMendeleyCode,
  fetchMendeleyProfile,
  mendeleyOAuthConfig,
  mendeleyRedirectUri,
} from "@/lib/mendeley-client";
import {
  decodeMendeleyOauthCookie,
  mendeleyOauthCookieName,
  mendeleyOauthCookieOptions,
  saveMendeleyTokens,
} from "@/lib/mendeley-server";

function finish(origin, returnTo, result) {
  const back = new URL(returnTo, origin);
  back.searchParams.set("mendeley", result);
  const response = NextResponse.redirect(back);
  response.cookies.set(mendeleyOauthCookieName(), "", {
    ...mendeleyOauthCookieOptions(),
    maxAge: 0,
  });
  return response;
}

export async function GET(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const cookieStore = await cookies();
  const stored = decodeMendeleyOauthCookie(cookieStore.get(mendeleyOauthCookieName())?.value);
  const returnTo = stored?.returnTo || "/app";

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || stored.state !== state) {
    return finish(origin, returnTo, "failed");
  }

  const user = await getRequestUser();
  if (!user) return finish(origin, returnTo, "failed");

  const config = mendeleyOAuthConfig();
  if (!config) return finish(origin, returnTo, "not_configured");

  try {
    await assertWithinRateLimit(user.id, "mendeley_credentials", 10);
    const tokens = await exchangeMendeleyCode({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code,
      redirectUri: mendeleyRedirectUri(),
    });
    if (!tokens.refresh_token) return finish(origin, returnTo, "failed");
    const profile = await fetchMendeleyProfile(tokens.access_token);
    await saveMendeleyTokens(user.id, {
      profileId: profile.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });
  } catch {
    return finish(origin, returnTo, "failed");
  }

  return finish(origin, returnTo, "connected");
}
