import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { destroyAsset } from "../../src/integrations/cloudinary.ts";
import { processAssetDeletions } from "../../src/services/asset-cleanup.service.ts";
import { app } from "../../src/app.ts";
import { db } from "../../src/config/database.ts";
import { config } from "../../src/config/env.ts";

vi.mock("../../src/integrations/cloudinary.ts", () => ({
  uploadAsset: vi.fn(async () => ({
    secure_url: "https://res.cloudinary.com/test/image/upload/garment.webp",
    public_id: "catalogue/integration-image",
    width: 20,
    height: 20,
  })),
  destroyAsset: vi.fn(async () => {}),
}));

const admin = request.agent(app);
const editor = request.agent(app);
let adminHeaders: Record<string, string>;
let editorHeaders: Record<string, string>;
let categoryId: string;
let productId: string;
let defaultId: string;
let secondId: string;
let imageId: string;
let adminId: string;

async function signIn(agent: ReturnType<typeof request.agent>, email: string) {
  const csrf = await agent.get("/api/auth/csrf");
  const headers = {
    origin: config.PUBLIC_ORIGIN,
    "x-csrf-token": csrf.body.token,
  };
  const response = await agent.post("/api/auth/login").set(headers).send({ email, password: "integration-password-123" });
  expect(response.status).toBe(200);
  return headers;
}

beforeAll(async () => {
  if (!new URL(config.DATABASE_URL).pathname.endsWith("_test")) throw new Error("Refusing to clear a non-test database");
  await db.$executeRawUnsafe('TRUNCATE "OrderItem", "Order", "AssetDeletion", "ProductImage", "ProductVariant", "Product", "Category", "AdminSession", "OAuthIdentity", "AdminUser" CASCADE');
  const passwordHash = await argon2.hash("integration-password-123");
  const user = await db.adminUser.create({
    data: {
      name: "Test Admin",
      email: "admin@test.invalid",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      approvedAt: new Date(),
    },
  });
  adminId = user.id;
  await db.adminUser.create({
    data: {
      name: "Test Editor",
      email: "editor@test.invalid",
      passwordHash,
      role: "EDITOR",
      isActive: true,
      approvedAt: new Date(),
    },
  });
  await db.adminUser.create({
    data: {
      name: "Pending",
      email: "pending@test.invalid",
      passwordHash,
      role: "EDITOR",
    },
  });
  adminHeaders = await signIn(admin, "admin@test.invalid");
  editorHeaders = await signIn(editor, "editor@test.invalid");
});
afterAll(async () => {
  await db.$disconnect();
});

describe.sequential("real PostgreSQL catalogue workflows", () => {
  it("denies EDITOR user management", async () => {
    expect((await editor.get("/api/admin/users")).status).toBe(403);
    expect((await editor.post("/api/admin/users").set(editorHeaders).send({})).status).toBe(403);
  });
  it("denies pending password accounts", async () => {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/auth/csrf");
    const response = await agent.post("/api/auth/login").set({ origin: config.PUBLIC_ORIGIN, "x-csrf-token": csrf.body.token }).send({
      email: "pending@test.invalid",
      password: "integration-password-123",
    });
    expect(response.status).toBe(403);
  });
  it("allows an editor to create categories", async () => {
    const response = await editor.post("/api/admin/categories").set(editorHeaders).send({ name: "Clothing", slug: "clothing" });
    expect(response.status).toBe(201);
    categoryId = response.body.id;
  });
  it("atomically creates a draft and its active default variant", async () => {
    const response = await admin
      .post("/api/admin/products")
      .set(adminHeaders)
      .send({
        name: "Test Shirt",
        slug: "test-shirt",
        description: "A test garment",
        categoryId,
        price: "1000",
        discountPercentage: "10",
        defaultVariant: {
          name: "Medium",
          sku: "TEST-M",
          attributes: { size: "M" },
        },
      });
    expect(response.status).toBe(201);
    expect(response.body.variants).toHaveLength(1);
    expect(response.body.variants[0]).toMatchObject({
      isDefault: true,
      isActive: true,
      price: null,
      effectivePrice: "900.00",
    });
    productId = response.body.id;
    defaultId = response.body.variants[0].id;
  });
  it("hides drafts from public details and search", async () => {
    expect((await request(app).get("/api/products/test-shirt")).status).toBe(404);
    expect((await request(app).get("/api/products?q=shirt")).body.total).toBe(0);
  });
  it("rejects publishing without an image", async () => {
    expect((await admin.patch(`/api/admin/products/${productId}`).set(adminHeaders).send({ status: "PUBLISHED" })).status).toBe(409);
  });
  it("blocks category deletion when products refer to it", async () => {
    expect((await admin.delete(`/api/admin/categories/${categoryId}`).set(adminHeaders)).status).toBe(409);
  });
  it("validates variant ownership before uploading", async () => {
    const response = await admin.post("/api/admin/uploads").set(adminHeaders).field("productId", productId).field("variantId", randomUUID()).attach("images", Buffer.from("bad"), "image.jpg");
    expect(response.status).toBe(400);
  });
  it("decodes and uploads a real image through the provider adapter", async () => {
    const jpeg = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer();
    const response = await admin.post("/api/admin/uploads").set(adminHeaders).field("productId", productId).field("alt", "A white shirt").attach("images", jpeg, "shirt.jpg");
    expect(response.status).toBe(201);
    imageId = response.body.items[0].id;
  });
  it("allows editors to publish and returns a public decimal-string contract", async () => {
    expect((await editor.patch(`/api/admin/products/${productId}`).set(editorHeaders).send({ status: "PUBLISHED" })).status).toBe(200);
    const response = await request(app).get("/api/products/test-shirt");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      currency: "BDT",
      price: "1000.00",
      fromPrice: "900.00",
      status: "PUBLISHED",
    });
    expect(response.body.images[0].alt).toBe("A white shirt");
  });
  it("reserves variant stock atomically and releases or consumes it during admin review", async () => {
    expect((await admin.patch(`/api/admin/variants/${defaultId}`).set(adminHeaders).send({ stockOnHand: 4 })).status).toBe(200);
    expect((await request(app).get("/api/products/test-shirt")).body.variants.find((variant: { id: string }) => variant.id === defaultId)).toMatchObject({ inStock: true, availableQuantity: 4 });
    const alternate = await admin
      .post(`/api/admin/products/${productId}/variants`)
      .set(adminHeaders)
      .send({ name: "Large", sku: "TEST-EDIT-L", price: "1200", attributes: { size: "EDIT" }, stockOnHand: 5 });
    expect(alternate.status).toBe(201);
    const alternateId = alternate.body.variants.find((variant: { sku: string }) => variant.sku === "TEST-EDIT-L").id;

    const details = {
      customerName: "Guest Customer",
      email: "guest@test.invalid",
      phone: "+8801700000000",
      deliveryAddress: "12 Example Road, Dhaka",
      deliveryArea: "Dhaka",
      customerNote: "Call on arrival",
    };
    const attempts = await Promise.all(
      [0, 1].map(() =>
        request(app)
          .post("/api/orders")
          .send({ ...details, items: [{ variantId: defaultId, quantity: 3 }] }),
      ),
    );
    expect(attempts.map((response) => response.status).sort()).toEqual([201, 409]);
    const pending = attempts.find((response) => response.status === 201)!.body;
    expect(pending).toMatchObject({ status: "PENDING_REVIEW", subtotal: "2700.00" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: defaultId } })).stockReserved).toBe(3);

    const rejected = await admin.patch(`/api/admin/orders/${pending.id}/status`).set(adminHeaders).send({ status: "REJECTED" });
    expect(rejected.status).toBe(200);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: defaultId } })).stockReserved).toBe(0);
    expect((await admin.patch(`/api/admin/orders/${pending.id}/status`).set(adminHeaders).send({ status: "REJECTED" })).status).toBe(200);
    const rejectedOrder = (await admin.get("/api/admin/orders")).body.items.find((order: { id: string }) => order.id === pending.id);
    expect(
      (
        await admin
          .patch(`/api/admin/orders/${pending.id}`)
          .set(adminHeaders)
          .send({ ...details, updatedAt: rejectedOrder.updatedAt, items: [{ variantId: defaultId, quantity: 1 }] })
      ).status,
    ).toBe(409);

    const forgedPrice = await request(app)
      .post("/api/orders")
      .send({ ...details, items: [{ variantId: defaultId, quantity: 1, unitPrice: "0.01" }] });
    expect(forgedPrice.status).toBe(400);

    const editable = await request(app)
      .post("/api/orders")
      .send({ ...details, items: [{ variantId: defaultId, quantity: 2 }] });
    expect(editable.status).toBe(201);
    const opened = (await admin.get("/api/admin/orders")).body.items.find((order: { id: string }) => order.id === editable.body.id);
    expect(opened.updatedAt).toBeTruthy();
    expect((await admin.patch(`/api/admin/variants/${alternateId}`).set(adminHeaders).send({ price: "1300" })).status).toBe(200);
    const changed = await admin
      .patch(`/api/admin/orders/${editable.body.id}`)
      .set(adminHeaders)
      .send({
        ...details,
        customerName: "Updated Guest",
        deliveryAddress: "14 Example Road, Dhaka",
        updatedAt: opened.updatedAt,
        items: [{ variantId: alternateId, quantity: 3 }],
      });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ status: "PENDING_REVIEW", customerName: "Updated Guest", subtotal: "3510.00" });
    expect(changed.body.items[0]).toMatchObject({ sku: "TEST-EDIT-L", quantity: 3, unitPrice: "1170.00", lineTotal: "3510.00" });
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: defaultId } })).toMatchObject({ stockReserved: 0 });
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: alternateId } })).toMatchObject({ stockReserved: 3 });

    expect((await admin.patch(`/api/admin/variants/${alternateId}`).set(adminHeaders).send({ price: "1400" })).status).toBe(200);
    const contactOnly = await admin
      .patch(`/api/admin/orders/${editable.body.id}`)
      .set(adminHeaders)
      .send({
        ...details,
        customerName: "Updated Contact",
        deliveryAddress: "16 Example Road, Dhaka",
        updatedAt: changed.body.updatedAt,
        items: [{ variantId: alternateId, quantity: 3 }],
      });
    expect(contactOnly.status).toBe(200);
    expect(contactOnly.body).toMatchObject({ customerName: "Updated Contact", subtotal: "3510.00" });
    expect(contactOnly.body.items[0]).toMatchObject({ unitPrice: "1170.00", lineTotal: "3510.00" });
    expect(
      (
        await admin
          .patch(`/api/admin/orders/${editable.body.id}`)
          .set(adminHeaders)
          .send({ ...details, updatedAt: changed.body.updatedAt, items: [{ variantId: alternateId, quantity: 3 }] })
      ).status,
    ).toBe(409);
    const noStock = await admin
      .patch(`/api/admin/orders/${editable.body.id}`)
      .set(adminHeaders)
      .send({
        ...details,
        updatedAt: contactOnly.body.updatedAt,
        items: [{ variantId: alternateId, quantity: 6 }],
      });
    expect(noStock.status).toBe(409);
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: alternateId } })).toMatchObject({ stockReserved: 3 });
    expect((await admin.patch(`/api/admin/orders/${editable.body.id}/status`).set(adminHeaders).send({ status: "CONFIRMED" })).status).toBe(200);

    const complete = await request(app)
      .post("/api/orders")
      .send({ ...details, items: [{ variantId: defaultId, quantity: 4 }] });
    expect(complete.status).toBe(201);
    const confirmed = await admin.patch(`/api/admin/orders/${complete.body.id}/status`).set(adminHeaders).send({ status: "CONFIRMED" });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.items[0]).toMatchObject({ sku: "TEST-M", quantity: 4, unitPrice: "900.00", lineTotal: "3600.00" });
    expect(
      (
        await admin
          .patch(`/api/admin/orders/${complete.body.id}`)
          .set(adminHeaders)
          .send({ ...details, updatedAt: confirmed.body.updatedAt, items: [{ variantId: defaultId, quantity: 4 }] })
      ).status,
    ).toBe(409);
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: defaultId } })).toMatchObject({ stockOnHand: 0, stockReserved: 0 });
    expect((await admin.get("/api/admin/orders")).body.items).toHaveLength(3);
  });
  it("reorders a complete owned image list atomically and rejects stale lists", async () => {
    expect(
      (
        await admin
          .patch(`/api/admin/products/${productId}/images/order`)
          .set(adminHeaders)
          .send({ imageIds: [imageId] })
      ).status,
    ).toBe(200);
    expect(
      (
        await admin
          .patch(`/api/admin/products/${productId}/images/order`)
          .set(adminHeaders)
          .send({ imageIds: [randomUUID()] })
      ).status,
    ).toBe(409);
  });
  it("rejects duplicate SKUs and attribute combinations", async () => {
    const base = { name: "Large", sku: "TEST-M", attributes: { size: "L" } };
    expect((await admin.post(`/api/admin/products/${productId}/variants`).set(adminHeaders).send(base)).status).toBe(409);
    expect(
      (
        await admin
          .post(`/api/admin/products/${productId}/variants`)
          .set(adminHeaders)
          .send({ ...base, sku: "TEST-DUP", attributes: { SIZE: " m " } })
      ).status,
    ).toBe(409);
  });
  it("resolves override prices and reassigns the default", async () => {
    const response = await admin
      .post(`/api/admin/products/${productId}/variants`)
      .set(adminHeaders)
      .send({
        name: "Large",
        sku: "TEST-L",
        price: "1200",
        attributes: { size: "L" },
        isDefault: true,
      });
    expect(response.status).toBe(201);
    const defaults = response.body.variants.filter((variant: { isDefault: boolean }) => variant.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].effectivePrice).toBe("1080.00");
    secondId = defaults[0].id;
  });
  it("does not reset published state or flags on unrelated PATCH", async () => {
    const response = await admin.patch(`/api/admin/products/${productId}`).set(adminHeaders).send({ name: "Updated Shirt" });
    expect(response.body.status).toBe("PUBLISHED");
    const variant = await admin.patch(`/api/admin/variants/${secondId}`).set(adminHeaders).send({ name: "Large Updated" });
    expect(variant.body.variants.find((item: { id: string }) => item.id === secondId)).toMatchObject({
      isDefault: true,
      attributes: { size: "L" },
      price: "1200.00",
    });
  });
  it("protects default variants and the final published image", async () => {
    expect((await admin.patch(`/api/admin/variants/${secondId}`).set(adminHeaders).send({ isActive: false })).status).toBe(409);
    expect((await admin.delete(`/api/admin/variants/${secondId}`).set(adminHeaders)).status).toBe(409);
    expect((await admin.delete(`/api/admin/images/${imageId}`).set(adminHeaders)).status).toBe(409);
    expect((await admin.delete(`/api/admin/variants/${defaultId}`).set(adminHeaders)).status).toBe(200);
  });
  it("never exposes inactive variants through SKU search", async () => {
    await admin
      .post(`/api/admin/products/${productId}/variants`)
      .set(adminHeaders)
      .send({
        name: "Hidden",
        sku: "SECRET-INACTIVE",
        attributes: { size: "XS" },
        isActive: false,
      });
    expect((await request(app).get("/api/products?q=SECRET-INACTIVE")).body.total).toBe(0);
    const response = await request(app).get("/api/products/test-shirt");
    expect(response.body.variants.every((variant: { isActive: boolean }) => variant.isActive)).toBe(true);
  });
  it("prevents category cycles", async () => {
    const child = await admin.post("/api/admin/categories").set(adminHeaders).send({ name: "Child", slug: "child", parentId: categoryId });
    expect((await admin.patch(`/api/admin/categories/${categoryId}`).set(adminHeaders).send({ parentId: child.body.id })).status).toBe(409);
  });
  it("protects the last active administrator", async () => {
    expect((await admin.patch(`/api/admin/users/${adminId}`).set(adminHeaders).send({ isActive: false })).status).toBe(409);
    expect((await admin.delete(`/api/admin/users/${adminId}`).set(adminHeaders)).status).toBe(409);
  });
  it("revokes the refresh family when an old refresh token is reused", async () => {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/auth/csrf");
    const headers = {
      origin: config.PUBLIC_ORIGIN,
      "x-csrf-token": csrf.body.token,
    };
    const login = await agent.post("/api/auth/login").set(headers).send({
      email: "admin@test.invalid",
      password: "integration-password-123",
    });
    const cookies = login.headers["set-cookie"] as unknown as string[];
    const oldRefresh = cookies.find((cookie) => cookie.startsWith("refresh="))!.split(";")[0];
    const cookie = `${oldRefresh}; csrf=${csrf.body.token}`;
    const rotated = await request(app).post("/api/auth/refresh").set(headers).set("Cookie", cookie);
    expect(rotated.status).toBe(200);
    expect((await request(app).post("/api/auth/refresh").set(headers).set("Cookie", cookie)).status).toBe(401);
    const nextAccess = (rotated.headers["set-cookie"] as unknown as string[]).find((cookie) => cookie.startsWith("access="))!.split(";")[0];
    expect((await request(app).get("/api/auth/me").set("Cookie", nextAccess)).status).toBe(401);
  });
  it("makes archived products disappear immediately", async () => {
    expect((await admin.patch(`/api/admin/products/${productId}`).set(adminHeaders).send({ status: "ARCHIVED" })).status).toBe(200);
    expect((await request(app).get("/api/products/test-shirt")).status).toBe(404);
  });
  it("serializes concurrent default changes", async () => {
    const active = await admin
      .post(`/api/admin/products/${productId}/variants`)
      .set(adminHeaders)
      .send({
        name: "Extra Large",
        sku: "TEST-XL",
        attributes: { size: "XL" },
      });
    const extra = active.body.variants.find((variant: { sku: string }) => variant.sku === "TEST-XL").id;
    const responses = await Promise.all([secondId, extra].map((id) => admin.patch(`/api/admin/variants/${id}`).set(adminHeaders).send({ isDefault: true })));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await db.productVariant.count({ where: { productId, isDefault: true } })).toBe(1);
  });
  it("queues deleted image assets and retries provider failures", async () => {
    expect((await admin.delete(`/api/admin/images/${imageId}`).set(adminHeaders)).status).toBe(204);
    expect(await db.assetDeletion.count()).toBe(1);
    vi.mocked(destroyAsset).mockRejectedValueOnce(new Error("Provider unavailable"));
    await processAssetDeletions();
    expect((await db.assetDeletion.findFirst())?.attempts).toBe(1);
    await db.assetDeletion.updateMany({ data: { nextAttemptAt: new Date(0) } });
    await processAssetDeletions();
    expect(await db.assetDeletion.count()).toBe(0);
  });
  it("revokes all descendants after concurrent refresh reuse", async () => {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/auth/csrf");
    const headers = {
      origin: config.PUBLIC_ORIGIN,
      "x-csrf-token": csrf.body.token,
    };
    const login = await agent.post("/api/auth/login").set(headers).send({
      email: "admin@test.invalid",
      password: "integration-password-123",
    });
    const refresh = (login.headers["set-cookie"] as unknown as string[]).find((cookie) => cookie.startsWith("refresh="))!.split(";")[0];
    const cookie = `${refresh}; csrf=${csrf.body.token}`;
    const responses = await Promise.all([0, 1].map(() => request(app).post("/api/auth/refresh").set(headers).set("Cookie", cookie)));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    const success = responses.find((response) => response.status === 200)!;
    const access = (success.headers["set-cookie"] as unknown as string[]).find((cookie) => cookie.startsWith("access="))!.split(";")[0];
    expect((await request(app).get("/api/auth/me").set("Cookie", access)).status).toBe(401);
  });
  it("requires ADMIN approval for a verified Google signup", async () => {
    const agent = request.agent(app);
    const start = await agent.get("/api/auth/google");
    const cookie = (start.headers["set-cookie"] as unknown as string[]).find((value) => value.startsWith("oauth="))!;
    const transaction = jwt.decode(decodeURIComponent(cookie.split(";")[0].slice("oauth=".length))) as jwt.JwtPayload;
    const tokenSpy = vi.spyOn(OAuth2Client.prototype, "getToken").mockResolvedValue({ tokens: { id_token: "mock-id-token" } } as never);
    const verifySpy = vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => ({
        sub: "google-test-subject",
        email: "google@test.invalid",
        email_verified: true,
        name: "Google User",
        nonce: transaction.nonce,
      }),
    } as never);
    const callback = await agent.get(`/api/auth/google/callback?state=${transaction.state}&code=mock-code`);
    expect(callback.headers.location).toContain("pending=1");
    const pending = await db.adminUser.findUniqueOrThrow({
      where: { email: "google@test.invalid" },
    });
    expect(pending).toMatchObject({
      role: "EDITOR",
      isActive: false,
      approvedAt: null,
    });
    expect((await admin.patch(`/api/admin/users/${pending.id}`).set(adminHeaders).send({ approve: true })).status).toBe(200);
    tokenSpy.mockRestore();
    verifySpy.mockRestore();
  });
  it("rejects an incorrect OAuth state without contacting Google", async () => {
    const agent = request.agent(app);
    await agent.get("/api/auth/google");
    const tokenSpy = vi.spyOn(OAuth2Client.prototype, "getToken");
    const response = await agent.get("/api/auth/google/callback?state=incorrect&code=mock-code");
    expect(response.headers.location).toContain("google-failed");
    expect(tokenSpy).not.toHaveBeenCalled();
    tokenSpy.mockRestore();
  });
  it("rejects a mismatched Google nonce", async () => {
    const agent = request.agent(app);
    const start = await agent.get("/api/auth/google");
    const cookie = (start.headers["set-cookie"] as unknown as string[]).find((value) => value.startsWith("oauth="))!;
    const transaction = jwt.decode(decodeURIComponent(cookie.split(";")[0].slice("oauth=".length))) as jwt.JwtPayload;
    const tokenSpy = vi.spyOn(OAuth2Client.prototype, "getToken").mockResolvedValue({ tokens: { id_token: "mock" } } as never);
    const verifySpy = vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => ({
        sub: "bad",
        email: "bad@test.invalid",
        email_verified: true,
        nonce: "incorrect",
      }),
    } as never);
    const response = await agent.get(`/api/auth/google/callback?state=${transaction.state}&code=mock`);
    expect(response.headers.location).toContain("google-failed");
    expect(await db.adminUser.findUnique({ where: { email: "bad@test.invalid" } })).toBeNull();
    tokenSpy.mockRestore();
    verifySpy.mockRestore();
  });
});
