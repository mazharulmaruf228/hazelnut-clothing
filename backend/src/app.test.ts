import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.ts";
import { config } from "./config/env.ts";

describe("API perimeter without a database", () => {
  it("is live", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
  it("protects admin APIs", async () => expect((await request(app).get("/api/admin/products")).status).toBe(401));
  it("blocks cross-origin mutations", async () => expect((await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "secret" })).status).toBe(403));
  it("allows configured origins through CORS and CSRF while rejecting other origins", async () => {
    const portfolioOrigin = "http://portfolio.example:4200";
    config.ADDITIONAL_ALLOWED_ORIGINS.push(portfolioOrigin);
    try {
      for (const origin of [config.PUBLIC_ORIGIN, portfolioOrigin]) {
        const preflight = await request(app).options("/api/auth/login").set({
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,x-csrf-token",
        });
        expect(preflight.status).toBe(204);
        expect(preflight.headers["access-control-allow-origin"]).toBe(origin);
        expect(preflight.headers["access-control-allow-credentials"]).toBe("true");
        expect(preflight.headers["access-control-allow-methods"]).toContain("POST");
        expect(preflight.headers["access-control-allow-headers"].toLowerCase()).toContain("x-csrf-token");
        expect(preflight.headers.vary).toContain("Origin");
      }

      const agent = request.agent(app);
      const csrf = await agent.get("/api/auth/csrf").set("Origin", portfolioOrigin);
      expect(csrf.headers["access-control-allow-origin"]).toBe(portfolioOrigin);
      const login = await agent.post("/api/auth/login").set({ Origin: portfolioOrigin, "X-CSRF-Token": csrf.body.token }).send({});
      expect(login.status).toBe(400);
      expect(login.headers["access-control-allow-origin"]).toBe(portfolioOrigin);
      expect(login.headers["access-control-allow-credentials"]).toBe("true");
      expect((await agent.post("/api/auth/login").set("Origin", portfolioOrigin).send({})).status).toBe(403);

      const untrustedOrigin = "https://untrusted.example";
      const denied = await agent.options("/api/auth/login").set({ Origin: untrustedOrigin, "Access-Control-Request-Method": "POST" });
      expect(denied.status).toBe(403);
      expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
      const untrustedLogin = await agent.post("/api/auth/login").set({ Origin: untrustedOrigin, "X-CSRF-Token": csrf.body.token }).send({});
      expect(untrustedLogin.status).toBe(403);
      expect(untrustedLogin.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      config.ADDITIONAL_ALLOWED_ORIGINS.pop();
    }
  });
  it("issues a CSRF cookie", async () => {
    const response = await request(app).get("/api/auth/csrf");
    expect(response.body.token).toHaveLength(64);
    expect(response.headers["set-cookie"]).toBeDefined();
  });
  it("returns all static district delivery options without a database", async () => {
    const response = await request(app).get("/api/orders/delivery-options");
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(64);
    expect(response.body.items.find((item: { district: string }) => item.district === "Dhaka")).toMatchObject({ deliveryCharge: "80.00" });
    expect(response.body.items.find((item: { district: string }) => item.district === "Khulna")).toMatchObject({ deliveryCharge: "100.00" });
  });
  it("reports the configured checkout mode", async () => {
    expect((await request(app).get("/api/orders/payment-mode")).body).toEqual({ mode: config.PAYMENT_MODE });
  });
  it("rejects malformed or ambiguous guest order lookup input", async () => {
    const response = await request(app).post("/api/orders/lookup").send({
      orderNumber: "00000000-0000-4000-8000-000000000001",
      email: "guest@example.com",
      phone: "+8801700000000",
    });
    expect(response.status).toBe(400);
  });
});
