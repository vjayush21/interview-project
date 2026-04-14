import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env";
import { authRoutes } from "./http/routes/authRoutes";
import { meRoutes } from "./http/routes/meRoutes";
import { openrouterRoutes } from "./http/routes/openrouterRoutes";
import { sessionRoutes } from "./http/routes/sessionRoutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false, // Required for some frontend scripts/fonts depending on setup
  }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 200,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  const api = express.Router();
  api.use("/auth", authRoutes);
  api.use(meRoutes);
  api.use(openrouterRoutes);
  api.use(sessionRoutes);

  app.use("/api/v1", api);

  // Serve Frontend Static Files
  const frontendPath = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendPath));

  // Handle React Router fallback
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  return app;
}

