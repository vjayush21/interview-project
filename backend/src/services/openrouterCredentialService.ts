import { z } from "zod";
import { OpenRouterCredential } from "../db/models/OpenRouterCredential.js";
import { decryptOpenRouterApiKey, encryptOpenRouterApiKey } from "../security/openrouterKeyCrypto.js";
import { verifyOpenRouterApiKey } from "../openrouter/client.js";

const apiKeySchema = z.object({
  apiKey: z.string().min(10).max(5000)
});

export async function getCredentialForUser(userId: number) {
  return OpenRouterCredential.findOne({ where: { userId } });
}

export async function upsertApiKey(userId: number, input: unknown) {
  const { apiKey } = apiKeySchema.parse(input);
  const enc = encryptOpenRouterApiKey(apiKey);

  const verified = await verifyOpenRouterApiKey(apiKey);
  const status: "active" | "invalid" = verified.valid ? "active" : "invalid";

  const existing = await OpenRouterCredential.findOne({ where: { userId } });
  if (existing) {
    await existing.update({
      apiKeyCiphertext: enc.apiKeyCiphertext,
      apiKeyKeyVersion: enc.apiKeyKeyVersion,
      apiKeyHint: enc.apiKeyHint,
      status,
      lastVerifiedAt: verified.valid ? new Date() : null
    });
    return { ok: true as const, status, keyHint: `sk-...${enc.apiKeyHint}` };
  }

  await OpenRouterCredential.create({
    userId,
    apiKeyCiphertext: enc.apiKeyCiphertext,
    apiKeyKeyVersion: enc.apiKeyKeyVersion,
    apiKeyHint: enc.apiKeyHint,
    status,
    lastVerifiedAt: verified.valid ? new Date() : null
  });

  return { ok: true as const, status, keyHint: `sk-...${enc.apiKeyHint}` };
}

export async function getDecryptedKey(userId: number) {
  const cred = await OpenRouterCredential.findOne({ where: { userId } });
  if (!cred) return null;
  if (cred.status !== "active") return null;
  return decryptOpenRouterApiKey(cred.apiKeyCiphertext);
}

export async function verifyKey(userId: number) {
  const cred = await OpenRouterCredential.findOne({ where: { userId } });
  if (!cred) {
    return { ok: false as const, error: { code: "OPENROUTER_KEY_REQUIRED", message: "OpenRouter key required" } };
  }

  if (cred.status === "revoked") {
    return { ok: false as const, error: { code: "OPENROUTER_KEY_INVALID", message: "OpenRouter key invalid" } };
  }

  const apiKey = decryptOpenRouterApiKey(cred.apiKeyCiphertext);
  const verified = await verifyOpenRouterApiKey(apiKey);
  const status: "active" | "invalid" = verified.valid ? "active" : "invalid";

  await cred.update({
    status,
    lastVerifiedAt: verified.valid ? new Date() : cred.lastVerifiedAt
  });

  if (!verified.valid) {
    return { ok: false as const, error: { code: "OPENROUTER_KEY_INVALID", message: "OpenRouter key invalid" } };
  }

  return { ok: true as const, status };
}

export async function removeKey(userId: number) {
  const cred = await OpenRouterCredential.findOne({ where: { userId } });
  if (!cred) {
    return { ok: true as const };
  }
  await cred.destroy();
  return { ok: true as const };
}

export async function getActiveApiKeyOrNull(userId: number) {
  const cred = await OpenRouterCredential.findOne({ where: { userId } });
  if (!cred || cred.status !== "active") return null;
  return decryptOpenRouterApiKey(cred.apiKeyCiphertext);
}

