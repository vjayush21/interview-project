import crypto from "node:crypto";
import { env } from "../config/env";

function getMasterKey() {
  const raw = Buffer.from(env.OPENROUTER_KEY_MASTER_KEY_BASE64, "base64");
  if (raw.length !== 32) {
    throw new Error("OPENROUTER_KEY_MASTER_KEY_BASE64 must be 32 bytes (base64-encoded)");
  }
  return raw;
}

export function encryptOpenRouterApiKey(apiKey: string) {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, tag, ciphertext]);
  const hint = apiKey.length >= 6 ? apiKey.slice(-6) : apiKey;

  return {
    apiKeyCiphertext: packed,
    apiKeyHint: hint,
    apiKeyKeyVersion: env.OPENROUTER_KEY_MASTER_KEY_VERSION
  };
}

export function decryptOpenRouterApiKey(packed: Buffer) {
  const masterKey = getMasterKey();
  if (packed.length < 12 + 16 + 1) {
    throw new Error("Invalid ciphertext");
  }

  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

