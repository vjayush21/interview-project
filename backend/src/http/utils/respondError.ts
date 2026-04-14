import type { Response } from "express";
import { ZodError } from "zod";

export function respondZodError(res: Response, err: ZodError) {
  res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation error",
      details: err.issues.map((i) => ({ path: i.path, message: i.message }))
    }
  });
}

export function respondError(res: Response, code: string, message: string, status = 400) {
  res.status(status).json({ error: { code, message, details: [] } });
}

