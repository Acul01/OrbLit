import crypto from "node:crypto";

// Server-only AES-256-GCM encryption for the user's Zotero API key.
// Import ONLY from server code (Route Handlers) — never from a Client
// Component, and never send ZOTERO_ENCRYPTION_KEY to the browser.
//
// The user id is bound as additional authenticated data, so a ciphertext
// copied onto another user's row does not decrypt.
// Payload layout: base64(iv[12] || authTag[16] || ciphertext).
const KEY = process.env.ZOTERO_ENCRYPTION_KEY
  ? Buffer.from(process.env.ZOTERO_ENCRYPTION_KEY, "base64")
  : null;

function requireKey() {
  if (!KEY || KEY.length !== 32) {
    throw new Error("Encryption is not configured");
  }
  return KEY;
}

function aadFor(userId) {
  return Buffer.from(String(userId), "utf8");
}

function openDecipher(key, iv, authTag, ciphertext, aad) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  if (aad) decipher.setAAD(aad);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function encrypt(plaintext, userId) {
  if (!userId) throw new Error("encrypt requires a user id");
  const key = requireKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aadFor(userId));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

/** Returns `{ plaintext, legacy }`. `legacy` is true when the row was
 *  encrypted before user-id binding and should be rewritten. */
export function decrypt(payload, userId) {
  const key = requireKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 29) throw new Error("Invalid ciphertext");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  if (userId) {
    try {
      return {
        plaintext: openDecipher(key, iv, authTag, ciphertext, aadFor(userId)),
        legacy: false,
      };
    } catch {
      // Rows written before AAD binding still decrypt without it.
    }
  }
  return {
    plaintext: openDecipher(key, iv, authTag, ciphertext, null),
    legacy: Boolean(userId),
  };
}
