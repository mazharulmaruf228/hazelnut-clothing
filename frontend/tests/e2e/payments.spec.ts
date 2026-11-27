import { test, expect, type Page } from "@playwright/test";

const orderId = "a0b0c0d0-1234-4567-8123-a0b0c0d0e0f0";
const receipt = { id: orderId, status: "PENDING_PAYMENT", paymentMethod: "STRIPE", paymentStatus: "PENDING", currency: "bdt", subtotal: "900.00", deliveryCharge: "80.00", total: "980.00" };
const cartLine = { variantId: "b0b0c0d0-1234-4567-8123-a0b0c0d0e0f0", productId: "product", slug: "shirt", productName: "Cotton shirt", variantName: "Medium", sku: "SHIRT-M", unitPrice: "900.00", imageUrl: "", quantity: 1 };

async function seedCart(page: Page) {
  await page.addInitScript((line) => {
    if (!localStorage.getItem("hazelnut-cart")) localStorage.setItem("hazelnut-cart", JSON.stringify([line]));
  }, cartLine);
  await page.route("**/api/orders/payment-methods", (route) => route.fulfill({ json: { items: ["COD", "STRIPE"], stripeTestMode: true } }));
}

async function fillCheckout(page: Page) {
  await page.goto("/checkout");
  await page.getByLabel("Name", { exact: true }).fill("Stripe Browser Guest");
  await page.getByLabel("Email", { exact: true }).fill("stripe-browser@example.invalid");
  await page.getByLabel("Phone", { exact: true }).fill("+8801700000000");
  await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Dhaka");
  await page.getByLabel("Postcode", { exact: true }).fill("1200");
  await page.getByLabel("House / road", { exact: true }).fill("12 Browser Road");
  await page.getByRole("radio", { name: "Stripe (test mode)", exact: true }).check();
}

async function cartQuantity(page: Page) {
  return page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("hazelnut-cart") || "[]");
    const lines = Array.isArray(stored) ? stored : stored.lines;
    return lines.reduce((total: number, line: { quantity: number }) => total + line.quantity, 0);
  });
}

test("Stripe redirects without clearing the bag, verifies payment and settles once", async ({ page }, testInfo) => {
  await seedCart(page);
  let paid = false;
  await page.route("**/api/orders", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.paymentMethod).toBe("STRIPE");
    expect(body.checkoutKey).toMatch(/^[a-f0-9-]{36}$/);
    expect(body).not.toHaveProperty("total");
    await route.fulfill({ status: 201, json: { ...receipt, checkoutUrl: "https://checkout.stripe.com/c/pay/browser-fixture" } });
  });
  await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Stripe sandbox fixture</h1>" }));
  await page.route(`**/api/orders/${orderId}/payment`, async (route) => {
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    await route.fulfill({ json: paid ? { ...receipt, status: "CONFIRMED", paymentStatus: "PAID" } : receipt });
  });
  await fillCheckout(page);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("stripe-checkout.png"), fullPage: true });
  await page.getByRole("button", { name: "Pay with Stripe", exact: true }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com/);
  await page.goto(`/order-placed?order=${orderId}&payment=stripe`);
  await expect(page.getByRole("heading", { name: "Payment pending", exact: true })).toBeVisible();
  expect(await cartQuantity(page)).toBe(1);
  paid = true;
  await expect(page.getByRole("heading", { name: "Thank you.", exact: true })).toBeVisible();
  await expect.poll(() => cartQuantity(page)).toBe(0);
  await page.evaluate((line) => {
    const state = JSON.parse(localStorage.getItem("hazelnut-cart")!);
    state.lines.push(line);
    localStorage.setItem("hazelnut-cart", JSON.stringify(state));
  }, cartLine);
  await page.reload();
  await expect(page.getByText("Payment received. Your order is confirmed.")).toBeVisible();
  expect(await cartQuantity(page)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("stripe-confirmed.png"), fullPage: true });
});

test("Stripe cancellation and expiry retain the bag and never show paid success", async ({ page }) => {
  await seedCart(page);
  await page.route("**/api/orders", (route) => route.fulfill({ status: 201, json: { ...receipt, checkoutUrl: "https://checkout.stripe.com/c/pay/browser-fixture" } }));
  await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Stripe sandbox fixture</h1>" }));
  await fillCheckout(page);
  await page.getByRole("button", { name: "Pay with Stripe", exact: true }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com/);
  await page.goto("/checkout?payment=cancelled");
  await expect(page.getByRole("heading", { name: "Delivery details" })).toBeVisible();
  expect(await cartQuantity(page)).toBe(1);
  await page.route(`**/api/orders/${orderId}/payment`, (route) => route.fulfill({ json: { ...receipt, status: "PAYMENT_EXPIRED", paymentStatus: "UNPAID" } }));
  await page.goto(`/order-placed?order=${orderId}&payment=stripe`);
  await expect(page.getByRole("heading", { name: "Checkout expired", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thank you.", exact: true })).toHaveCount(0);
  expect(await cartQuantity(page)).toBe(1);
  await page.route(`**/api/orders/${orderId}/payment`, (route) => route.fulfill({ json: { ...receipt, status: "CONFIRMED", paymentStatus: "REFUND_PENDING" } }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Payment status", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order cancelled", exact: true })).toHaveCount(0);
});

test("admin can confirm an unshipped cancellation and see refund status", async ({ page }, testInfo) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill("test-admin@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("Catalogue-e2e-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  let cancelled = false;
  await page.route("**/api/admin/orders", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            ...receipt,
            status: cancelled ? "CANCELLED" : "CONFIRMED",
            paymentStatus: cancelled ? "REFUND_PENDING" : "PAID",
            customerName: "Stripe Browser Guest",
            email: "stripe-browser@example.invalid",
            phone: "+8801700000000",
            deliveryAddress: "12 Browser Road",
            district: "Dhaka",
            postcode: "1200",
            deliveryArea: "",
            customerNote: "",
            paymentReviewRequired: false,
            items: [{ ...cartLine, id: "item", lineTotal: "900.00" }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
  await page.route(`**/api/admin/orders/${orderId}/cancel-refund`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({ notShipped: true });
    expect(route.request().headers()["x-csrf-token"]).toBeTruthy();
    cancelled = true;
    await route.fulfill({ json: { ...receipt, status: "CANCELLED", paymentStatus: "REFUND_PENDING" } });
  });
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  await page.getByRole("button", { name: "Cancel and refund unshipped order", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("has not shipped");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "stripe-browser@example.invalid" })).toContainText("REFUND PENDING");
  await page.getByRole("table").evaluate((table) => {
    if (table.parentElement) table.parentElement.scrollLeft = 0;
  });
  await page.screenshot({ path: testInfo.outputPath("stripe-admin-refund.png"), fullPage: true });
});
