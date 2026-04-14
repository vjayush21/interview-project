import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../security/jwt.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: { userId: number };
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing token", details: [] } });
    return;
  }

  try {
    const { userId } = verifyAccessToken(token);
    req.auth = { userId };
    next();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token", details: [] } });
  }
}
