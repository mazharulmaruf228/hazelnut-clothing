import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "./config/env.ts";
import { initiateSandboxCheckout, validateSandboxPayment } from "./integrations/sslcommerz.ts";

const previous = { storeId: config.SSLCOMMERZ_STORE_ID, password: config.SSLCOMMERZ_STORE_PASSWORD, origin: config.PAYMENT_CALLBACK_ORIGIN };
const checkout = {
  transactionId: "payment-test-123",
  total: "1080.00",
  customerName: "Test Customer",
  email: "customer@example.com",
  phone: "+8801700000000",
  address: "12 Example Road",
  district: "Dhaka",
  postcode: "1200",
};

afterEach(() => {
  config.SSLCOMMERZ_STORE_ID = previous.storeId;
  config.SSLCOMMERZ_STORE_PASSWORD = previous.password;
  config.PAYMENT_CALLBACK_ORIGIN = previous.origin;
  vi.unstubAllGlobals();
});

describe("SSLCOMMERZ sandbox adapter", () => {
  it("creates a hosted session using server-side credentials and sandbox callbacks", async () => {
    config.SSLCOMMERZ_STORE_ID = "test-store";
    config.SSLCOMMERZ_STORE_PASSWORD = "test-password";
    config.PAYMENT_CALLBACK_ORIGIN = "https://shop.example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "SUCCESS", sessionkey: "session", GatewayPageURL: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?session=abc" })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await initiateSandboxCheckout(checkout)).toEqual({ sessionKey: "session", gatewayUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?session=abc" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://sandbox.sslcommerz.com/gwprocess/v4/api.php");
    expect(options.body.get("total_amount")).toBe("1080.00");
    expect(options.body.get("tran_id")).toBe(checkout.transactionId);
    expect(options.body.get("ipn_url")).toBe("https://shop.example.com/api/payments/ipn");
    expect(options.body.get("store_passwd")).toBe("test-password");
  });

  it("rejects checkout redirects outside the sandbox origin", async () => {
    config.SSLCOMMERZ_STORE_ID = "test-store";
    config.SSLCOMMERZ_STORE_PASSWORD = "test-password";
    config.PAYMENT_CALLBACK_ORIGIN = "https://shop.example.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "SUCCESS", sessionkey: "session", GatewayPageURL: "https://example.com/pay" }))));
    await expect(initiateSandboxCheckout(checkout)).rejects.toThrow("Invalid SSLCOMMERZ sandbox checkout URL");
  });

  it("validates using the sandbox server API", async () => {
    config.SSLCOMMERZ_STORE_ID = "test-store";
    config.SSLCOMMERZ_STORE_PASSWORD = "test-password";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "VALID", tran_id: "transaction", val_id: "validation", currency_type: "BDT", currency_amount: "1080.00", risk_level: "0" })));
    vi.stubGlobal("fetch", fetchMock);
    expect((await validateSandboxPayment("validation")).tran_id).toBe("transaction");
    expect(new URL(fetchMock.mock.calls[0][0]).origin).toBe("https://sandbox.sslcommerz.com");
  });
});
