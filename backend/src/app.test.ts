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
  it("returns all static district delivery options without a database", async () => {
    const response = await request(app).get("/api/orders/delivery-options");
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(64);
    expect(response.body.items.find((item: { district: string }) => item.district === "Dhaka")).toMatchObject({ deliveryCharge: "80.00" });
    expect(response.body.items.find((item: { district: string }) => item.district === "Khulna")).toMatchObject({ deliveryCharge: "100.00" });
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
