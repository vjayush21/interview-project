import { Router } from "express";
import { z } from "zod";
import { authRequired } from "../middleware/authRequired";
import { User } from "../../db/models/User";
import { getCredentialForUser } from "../../services/openrouterCredentialService";

export const meRoutes = Router();

meRoutes.get("/me", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized", details: [] } });
    return;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found", details: [] } });
    return;
  }

  const credential = await getCredentialForUser(userId);

  res.status(200).json({ 
    user: { id: user.id, email: user.email, displayName: user.displayName },
    openrouterKeyStatus: credential ? credential.status : "missing"
  });
});

const updateMeSchema = z.object({
  displayName: z.string().min(2).max(100),
});

meRoutes.put("/me", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized", details: [] } });
    return;
  }

  try {
    const data = updateMeSchema.parse(req.body);
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found", details: [] } });
      return;
    }

    await user.update({ displayName: data.displayName });
    
    res.status(200).json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.errors } });
      return;
    }
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: err.message || "Internal server error", details: [] } });
  }
});

