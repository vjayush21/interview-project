import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

function normalizeMasterKeyBase64(input: string) {
  const trimmed = input.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex").toString("base64");
  }
  return trimmed;
}

function isBase64Key32Bytes(value: string) {
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length === 32;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().transform((str) => str.split(",").map(s => s.trim())),

  MYSQL_HOST: z.string().default("127.0.0.1"),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: z.string().default("interviewai"),
  MYSQL_USER: z.string().default("interviewai"),
  MYSQL_PASSWORD: z.string().default("interviewai"),

  JWT_ACCESS_TOKEN_SECRET: z.string().min(20),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),

  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api"),
  OPENROUTER_KEY_MASTER_KEY_BASE64: z
    .string()
    .refine(isBase64Key32Bytes, "OPENROUTER_KEY_MASTER_KEY_BASE64 must be base64 for exactly 32 bytes"),
  OPENROUTER_KEY_MASTER_KEY_VERSION: z.string().min(1).default("v1"),

  MIGRATE_ON_START: z
    .string()
    .optional()
    .transform((v) => (v ?? "true").toLowerCase() === "true")
});

const rawEnv = {
  ...process.env,
  JWT_ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET_KEY,
  OPENROUTER_KEY_MASTER_KEY_BASE64:
    process.env.OPENROUTER_KEY_MASTER_KEY_BASE64 ??
    (process.env.OPENROUTER_KEY_MASTER_KEY ? normalizeMasterKeyBase64(process.env.OPENROUTER_KEY_MASTER_KEY) : undefined)
};

export const env = envSchema.parse(rawEnv);
