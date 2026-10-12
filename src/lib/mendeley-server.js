import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { mendeleyOAuthConfig, refreshMendeleyToken } from "@/lib/mendeley-client";
import { isLocalMode } from "@/lib/mode";
import { readLocalMendeley, writeLocalMendeley } from "@/lib/local-store";
import { safeNextPath } from "@/lib/safe-next";
import { rateLimitResponse } from "@/lib/rate-limit";

const OAUTH_COOKIE = "mendeley_oauth";
const REFRESH_SKEW_MS = 60 * 1000;

export function mendeleyOauthCookieName() {
  return OAUTH_COOKIE;
}

export function mendeleyOauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
}

export function encodeMendeleyOauthCookie(state, returnTo) {
  return Buffer.from(JSON.stringify({ state, returnTo: safeNextPath(returnTo) }), "utf8").toString(
    "base64url"
  );
}

export function decodeMendeleyOauthCookie(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!parsed || typeof parsed.state !== "string" || typeof parsed.returnTo !== "string") return null;
    return { state: parsed.state, returnTo: safeNextPath(parsed.returnTo) };
  } catch {
    return null;
  }
}

function expiresAtFrom(expiresIn) {
  const seconds = Number(expiresIn);
  const lifetime = Number.isFinite(seconds) && seconds > 120 ? seconds : 3600;
  return new Date(Date.now() + (lifetime - 60) * 1000).toISOString();
}

export async function saveMendeleyTokens(userId, { profileId, accessToken, refreshToken, expiresIn }) {
  if (isLocalMode()) {
    await writeLocalMendeley({
      profileId: profileId || null,
      accessToken,
      refreshToken,
      expiresAt: expiresAtFrom(expiresIn),
    });
    return;
  }
  const admin = createAdminClient();
  const { error } = await admin.from("mendeley_credentials").upsert(
    {
      user_id: userId,
      mendeley_profile_id: profileId || null,
      encrypted_access_token: encrypt(accessToken, userId),
      encrypted_refresh_token: encrypt(refreshToken, userId),
      access_token_expires_at: expiresAtFrom(expiresIn),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error("Failed to save Mendeley credentials");
}

// Returns a usable access token, refreshing and rewriting the row when
// the stored one is inside the skew window. Null if Mendeley is not connected.
async function getLocalMendeleyAccess() {
  const stored = await readLocalMendeley();
  if (!stored) return null;
  const expiresAt = new Date(stored.expiresAt).getTime();
  if (stored.accessToken && Number.isFinite(expiresAt) && expiresAt > Date.now() + REFRESH_SKEW_MS) {
    return { accessToken: stored.accessToken, profileId: stored.profileId || "" };
  }
  const config = mendeleyOAuthConfig();
  if (!config) {
    const missing = new Error("Mendeley is not configured");
    missing.code = "MENDELEY_CONFIG";
    throw missing;
  }
  const tokens = await refreshMendeleyToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: stored.refreshToken,
  });
  await saveMendeleyTokens("local", {
    profileId: stored.profileId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || stored.refreshToken,
    expiresIn: tokens.expires_in,
  });
  return { accessToken: tokens.access_token, profileId: stored.profileId || "" };
}

export async function getMendeleyAccess(userId) {
  if (isLocalMode()) return getLocalMendeleyAccess();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mendeley_credentials")
    .select("mendeley_profile_id, encrypted_access_token, encrypted_refresh_token, access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;

  const accessToken = decrypt(data.encrypted_access_token, userId).plaintext;
  const refreshToken = decrypt(data.encrypted_refresh_token, userId).plaintext;
  const expiresAt = new Date(data.access_token_expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + REFRESH_SKEW_MS) {
    return { accessToken, profileId: data.mendeley_profile_id || "" };
  }

  const config = mendeleyOAuthConfig();
  if (!config) {
    const missing = new Error("Mendeley is not configured");
    missing.code = "MENDELEY_CONFIG";
    throw missing;
  }
  const tokens = await refreshMendeleyToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken,
  });
  await saveMendeleyTokens(userId, {
    profileId: data.mendeley_profile_id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresIn: tokens.expires_in,
  });
  return { accessToken: tokens.access_token, profileId: data.mendeley_profile_id || "" };
}

export function mendeleyErrorResponse(error, fallback) {
  if (error?.status === 429 || error?.status === 503) return rateLimitResponse(error);
  if (error?.code === "MENDELEY_INPUT") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (error?.code === "MENDELEY_REAUTH" || error?.code === "MENDELEY_CONFIG") {
    return Response.json({ error: "Reconnect Mendeley" }, { status: 401 });
  }
  return Response.json({ error: fallback }, { status: 502 });
}
