import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("health", () => {
  it("returns ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

