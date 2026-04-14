import { Router } from "express";
import { ZodError } from "zod";
import { login, signup } from "../../services/authService.js";
import { signAccessToken } from "../../security/jwt.js";
import { respondError, respondZodError } from "../utils/respondError.js";

export const authRoutes = Router();

authRoutes.post("/signup", async (req, res) => {
  try {
    const result = await signup(req.body);
    if (!result.ok) {
      respondError(res, result.error.code, result.error.message, 400);
      return;
    }

    const accessToken = signAccessToken(result.user.id);
    res.status(201).json({
      user: { id: result.user.id, email: result.user.email, displayName: result.user.displayName },
      accessToken
    });
  } catch (err) {
    if (err instanceof ZodError) {
      respondZodError(res, err);
      return;
    }
    respondError(res, "INTERNAL_ERROR", "Unexpected error", 500);
  }
});

authRoutes.post("/login", async (req, res) => {
  try {
    const result = await login(req.body);
    if (!result.ok) {
      respondError(res, result.error.code, result.error.message, 400);
      return;
    }

    const accessToken = signAccessToken(result.user.id);
    res.status(200).json({
      user: { id: result.user.id, email: result.user.email, displayName: result.user.displayName },
      accessToken
    });
  } catch (err) {
    if (err instanceof ZodError) {
      respondZodError(res, err);
      return;
    }
    respondError(res, "INTERNAL_ERROR", "Unexpected error", 500);
  }
});

