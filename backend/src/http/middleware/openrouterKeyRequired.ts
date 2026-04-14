import type { NextFunction, Request, Response } from "express";
import { getActiveApiKeyOrNull } from "../../services/openrouterCredentialService.js";

declare module "express-serve-static-core" {
  interface Request {
    openrouter?: { apiKey: string };
  }
}

export async function openrouterKeyRequired(req: Request, res: Response, next: NextFunction) {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized", details: [] } });
    return;
  }

  const apiKey = await getActiveApiKeyOrNull(userId);
  if (!apiKey) {
    res
      .status(400)
      .json({ error: { code: "OPENROUTER_KEY_REQUIRED", message: "OpenRouter key required", details: [] } });
    return;
  }

  req.openrouter = { apiKey };
  next();
}
