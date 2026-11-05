import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.ts";

describe("API perimeter without a database", () => {
  it("is live", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
  it("protects admin APIs", async () => expect((await request(app).get("/api/admin/products")).status).toBe(401));
  it("blocks cross-origin mutations", async () => expect((await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "secret" })).status).toBe(403));
  it("issues a CSRF cookie", async () => {
    const response = await request(app).get("/api/auth/csrf");
    expect(response.body.token).toHaveLength(64);
    expect(response.headers["set-cookie"]).toBeDefined();
  });
});
