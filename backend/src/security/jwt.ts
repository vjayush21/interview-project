import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

export type AccessTokenClaims = {
  sub: string;
  jti: string;
};

export function signAccessToken(userId: number) {
  const claims: AccessTokenClaims = {
    sub: String(userId),
    jti: crypto.randomUUID()
  };

  const token = jwt.sign(claims, env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN as unknown as jwt.SignOptions["expiresIn"]
  });

  return token;
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }
  const sub = (decoded as { sub?: unknown }).sub;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new Error("Invalid token");
  }
  const userId = Number(sub);
  if (!Number.isFinite(userId)) {
    throw new Error("Invalid token");
  }
  return { userId };
}
