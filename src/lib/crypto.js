import crypto from "node:crypto";

// Server-only AES-256-GCM encryption for the user's Zotero API key.
// Import ONLY from server code (Route Handlers) — never from a Client
// Component, and never send ZOTERO_ENCRYPTION_KEY to the browser.
//
// Payload layout: base64(iv[12] || authTag[16] || ciphertext).
const KEY = process.env.ZOTERO_ENCRYPTION_KEY
  ? Buffer.from(process.env.ZOTERO_ENCRYPTION_KEY, "base64")
  : null;

function requireKey() {
  if (!KEY || KEY.length !== 32) {
    throw new Error(
      "ZOTERO_ENCRYPTION_KEY is missing or not a 32-byte base64 value"
    );
  }
  return KEY;
}

export function encrypt(plaintext) {
  const key = requireKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64"
  );
}

export function decrypt(payload) {
  const key = requireKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}
