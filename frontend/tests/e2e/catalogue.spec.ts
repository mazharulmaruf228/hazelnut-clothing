import { test, expect, type Page } from "@playwright/test";
import { productSchema } from "../../src/schemas/api";
import AxeBuilder from "@axe-core/playwright";

async function capturePaintedPage(page: Page, path: string) {
  let previous = await page.screenshot({
    fullPage: true,
    animations: "disabled",
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await page.screenshot({
      path,
      fullPage: true,
      animations: "disabled",
    });
    if (current.equals(previous)) return;
    previous = current;
  }
  throw new Error("Full-page rendering did not stabilize");
}

async function login(page: Page, role = "admin") {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(`test-${role}@example.invalid`);
  await page.getByLabel("Password", { exact: true }).fill("Catalogue-e2e-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
}
async function selectRadixOption(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
test("server-rendered catalogue matches the independent API contract", async ({ request }) => {
  const api = await request.get("/api/products/everyday-oxford-shirt");
  expect(api.status()).toBe(200);
  const product = productSchema.parse(await api.json());
  expect(product.currency).toBe("BDT");
  const response = await request.get(`/products/${product.slug}`);
  const html = await response.text();
  expect(html).toContain("Everyday Oxford Shirt");
  expect(html).toContain("application/ld+json");
  expect(html).toContain("1701.00");
});
test("browse, search, choose variants and inspect real images", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Featured products" });
  await expect(carousel.locator('[role="group"][aria-roledescription="slide"]')).toHaveCount(6);
  await expect(carousel).toBeVisible();
  for (const image of await carousel.locator('[role="group"] a img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await image.evaluate((node) => (node as HTMLImageElement).decode());
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("img", { name: "A curated rail of everyday clothing" }).evaluate((node) => (node as HTMLImageElement).decode());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact || ""))).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  await capturePaintedPage(page, testInfo.outputPath("storefront.png"));
  await page.getByRole("link", { name: "The collection", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search products" }).fill("Oxford");
  await page.getByRole("button", { name: "Apply search and sort" }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await page.locator("article a").last().click();
  await expect(page.getByRole("heading", { name: "Everyday Oxford Shirt", exact: true })).toBeVisible();
  const variant = page.getByRole("button", { name: "XL", exact: true });
  if (testInfo.project.name === "mobile") await variant.tap();
  else await variant.click();
  await expect(variant).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("BDT 1,791.00")).toBeVisible();
  const quantity = page.getByRole("spinbutton", { name: "Quantity" });
  await quantity.fill("12");
  await expect(quantity).toHaveValue("10");
  await expect(page).toHaveURL(/variant=/);
  const enlarge = page.getByTitle("Enlarge product image");
  if (testInfo.project.name === "mobile") await enlarge.tap();
  else await enlarge.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close image", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("product.png"),
    fullPage: true,
  });
});
test("guest checkout reserves stock for admin review", async ({ page }) => {
  const runId = `${Date.now()}-${test.info().project.name}`;
  const customerName = `Guest Customer ${test.info().project.name}`;
  const email = `guest-${runId}@example.invalid`;
  await page.goto("/products/everyday-oxford-shirt");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
  await page.getByRole("link", { name: "Cart, 1 item" }).click();
  await expect(page.getByRole("heading", { name: "Shopping bag" })).toBeVisible();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByLabel("Name", { exact: true }).fill(customerName);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Phone", { exact: true }).fill("+8801700000000");
  await page.getByLabel("Delivery area", { exact: true }).fill("Dhaka");
  await page.getByLabel("Delivery address", { exact: true }).fill("12 Example Road, Dhaka");
  await page.getByRole("button", { name: "Place order for review" }).click();
  await expect(page.getByRole("heading", { name: "Thank you." })).toBeVisible();

  await login(page);
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  const orderRow = page.getByRole("row").filter({ hasText: email });
  await expect(orderRow).toContainText("PENDING REVIEW");
  await orderRow.getByRole("button", { name: `Edit order for ${customerName}` }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByRole("heading", { name: /Edit order/ })).toBeVisible();
  await editor.getByLabel("Customer name").fill("Updated Guest");
  await editor.getByRole("textbox", { name: "Delivery address" }).fill("14 Example Road, Dhaka");
  await editor.getByLabel("Quantity for item 1").fill("2");
  await expect(editor.getByText("Recalculated subtotal")).toBeVisible();
  await expect(editor.getByText("BDT 3,402.00")).toBeVisible();
  await editor.getByRole("button", { name: "Save order" }).click();
  await expect(editor).not.toBeVisible();
  await expect(orderRow).toContainText("Updated Guest");
  await expect(orderRow).toContainText("14 Example Road, Dhaka");
  await expect(orderRow).toContainText("PENDING REVIEW");
  await orderRow.getByRole("button", { name: "Confirm order" }).click();
  await expect(orderRow).toContainText("CONFIRMED");
});
test("featured carousel respects reduced motion and supports keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Featured products" });
  const activeSlide = carousel.locator('[role="group"][aria-roledescription="slide"][aria-hidden="false"]');
  const initialSlide = await activeSlide.getAttribute("aria-label");
  await expect(page.getByRole("button", { name: /automatic rotation/i })).toHaveCount(0);
  await page.waitForTimeout(5200);
  await expect(activeSlide).toHaveAttribute("aria-label", initialSlide || "");
  const next = page.getByRole("button", { name: "Next featured product" });
  await next.focus();
  await next.press("Enter");
  await expect(carousel.locator('[role="group"][aria-roledescription="slide"][aria-hidden="false"]')).not.toHaveAttribute("aria-label", initialSlide || "");
});
test("story image fold reverses with scroll and stays open for reduced motion", async ({ page }) => {
  await page.goto("/");
  const story = page.locator('section[aria-labelledby="story-title"]');
  const image = story.locator("img");
  const panels = story.locator(".story-fold-panels");
  await expect(image).toBeVisible();
  await image.evaluate((element) => (element as HTMLImageElement).decode());

  const supportsScrollTimeline = await page.evaluate(() => CSS.supports("view-timeline-name", "--story-section") && CSS.supports("animation-range", "entry 0% exit 100%"));
  if (supportsScrollTimeline) {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
    });
    const leftPanel = page.locator(".story-fold-left");
    const readPanelState = () =>
      leftPanel.evaluate((element) => ({
        transform: getComputedStyle(element).transform,
        opacity: getComputedStyle(element).opacity,
      }));
    const foldedAtStart = await readPanelState();
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(async () => (await readPanelState()).transform).not.toBe(foldedAtStart.transform);
    const revealing = await readPanelState();
    expect(revealing.transform).not.toBe(foldedAtStart.transform);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(async () => (await readPanelState()).opacity).toBe("0");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await readPanelState()).transform).toBe(foldedAtStart.transform);
    await expect(panels).toHaveCSS("display", "block");
  } else {
    await expect(panels).toHaveCSS("display", "none");
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panels).toHaveCSS("display", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test("admin creates a category, draft and dynamic variant", async ({ page }, testInfo) => {
  await login(page);
  const suffix = testInfo.project.name;
  await page.getByRole("link", { name: "Categories", exact: true }).click();
  await page.getByRole("button", { name: "Add category" }).click();
  await page.getByLabel("Name", { exact: true }).fill(`Browser ${suffix}`);
  await page.getByLabel("Slug", { exact: true }).fill(`browser-${suffix}`);
  await page.getByRole("button", { name: "Save category" }).click();
  await expect(page.locator("table")).toContainText(`Browser ${suffix}`);
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill("Unsaved Browser Product");
  await page.getByRole("main").getByRole("link", { name: "Products", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Continue editing", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\/new$/);
  await page.getByLabel("Name", { exact: true }).fill(`Browser Shirt ${suffix}`);
  await page.getByLabel("URL slug").fill(`browser-shirt-${suffix}`);
  await page.getByLabel("Description", { exact: true }).fill("A browser-tested cotton shirt.");
  await selectRadixOption(page, "Category", `Browser ${suffix}`);
  await page.getByLabel("Base price (BDT)").fill("1590");
  await page.getByLabel("Default variant SKU").fill(`BROWSER-${suffix}`);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Add variant", exact: true }).click();
  const variant = page.locator(".variant-editor");
  await variant.getByLabel("Name", { exact: true }).fill("Large");
  await variant.getByLabel("SKU", { exact: true }).fill(`BROWSER-${suffix}-L`);
  await variant.getByRole("button", { name: "Attribute", exact: true }).click();
  await variant.getByLabel("Attribute", { exact: true }).fill("size");
  await variant.getByLabel("Value", { exact: true }).fill("L");
  await variant.getByLabel("Stock on hand").fill("5");
  await variant.getByRole("button", { name: "Save variant" }).click();
  await expect(page.locator("table")).toContainText("size: L");
  await expect(page.locator("table")).toContainText("5 / 0");
  await selectRadixOption(page, "Status", "ARCHIVED");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Product saved.", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("admin.png"),
    fullPage: true,
  });
});
test("admin user dialogs preserve self-role restrictions and recover fixture identity", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Users", exact: true }).click();

  const adminRow = page.getByRole("row").filter({ hasText: "test-admin@example.invalid" });
  const editorRow = page.getByRole("row").filter({ hasText: "test-editor@example.invalid" });
  await expect(adminRow.getByRole("combobox", { name: "Role for Test ADMIN" })).toBeDisabled();
  await expect(editorRow).toBeVisible();

  await editorRow.getByRole("button", { name: "Edit Test EDITOR" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Browser Editor");
  await page.getByRole("button", { name: "Save user", exact: true }).click();
  await expect(editorRow).toContainText("Browser Editor");

  await editorRow.getByRole("button", { name: "Reset password for Browser Editor" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("Catalogue-e2e-password-123!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await editorRow.getByRole("button", { name: "Edit Browser Editor" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test EDITOR");
  await page.getByRole("button", { name: "Save user", exact: true }).click();
  await expect(editorRow).toContainText("Test EDITOR");
});
test("editor cannot access user management", async ({ page }) => {
  await login(page, "editor");
  await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Users" })).toHaveCount(0);
  expect((await page.request.get("/api/admin/users")).status()).toBe(403);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Administrator access required." })).toBeVisible();
});
