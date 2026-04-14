import { z } from "zod";
import { User } from "../db/models/User.js";
import { hashPassword, verifyPassword } from "../security/passwords.js";

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(72),
  displayName: z.string().min(1).max(120)
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(72)
});

export async function signup(input: unknown) {
  const data = signupSchema.parse(input);
  const email = data.email.toLowerCase();

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return { ok: false as const, error: { code: "EMAIL_TAKEN", message: "Email already in use" } };
  }

  const passwordHash = await hashPassword(data.password);
  const user = await User.create({
    email,
    passwordHash,
    displayName: data.displayName
  });

  return { ok: true as const, user };
}

export async function login(input: unknown) {
  const data = loginSchema.parse(input);
  const email = data.email.toLowerCase();

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return { ok: false as const, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } };
  }

  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    return { ok: false as const, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } };
  }

  return { ok: true as const, user };
}

