import { Router } from "express";
import { ZodError } from "zod";
import { authRequired } from "../middleware/authRequired";
import { removeKey, upsertApiKey, verifyKey } from "../../services/openrouterCredentialService";
import { respondError, respondZodError } from "../utils/respondError";

export const openrouterRoutes = Router();

openrouterRoutes.put("/openrouter/api-key", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }

  try {
    const result = await upsertApiKey(userId, req.body);
    res.status(200).json({ status: result.status, keyHint: result.keyHint });
  } catch (err) {
    if (err instanceof ZodError) {
      respondZodError(res, err);
      return;
    }
    respondError(res, "INTERNAL_ERROR", "Unexpected error", 500);
  }
});

openrouterRoutes.post("/openrouter/verify", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }

  if (req.body.apiKey) {
    // Verifying a new key before storing
    const { verifyOpenRouterApiKey } = await import("../../openrouter/client");
    const verified = await verifyOpenRouterApiKey(req.body.apiKey);
    if (!verified.valid) {
       respondError(res, "INVALID_KEY", "Invalid OpenRouter API key", 400);
       return;
    }
    res.status(200).json({ status: "active" });
    return;
  }

  // Verifying existing key
  const result = await verifyKey(userId);
  if (!result.ok) {
    respondError(res, result.error.code, result.error.message, 400);
    return;
  }
  res.status(200).json({ status: result.status });
});

openrouterRoutes.delete("/openrouter/api-key", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }
  await removeKey(userId);
  res.status(200).json({ status: "removed" });
});

