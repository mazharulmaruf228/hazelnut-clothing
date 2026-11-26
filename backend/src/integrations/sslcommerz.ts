import { z } from "zod";
import { config } from "../config/env.ts";

const sandboxOrigin = "https://sandbox.sslcommerz.com";

const validationResponse = z.object({
  status: z.string(),
  tran_id: z.string(),
  val_id: z.string(),
  currency_type: z.string(),
  currency_amount: z.string(),
  bank_tran_id: z.string().optional(),
  risk_level: z.union([z.string(), z.number()]),
});

function credentials() {
  if (!config.SSLCOMMERZ_STORE_ID || !config.SSLCOMMERZ_STORE_PASSWORD) throw new Error("SSLCOMMERZ sandbox credentials are not configured");
  return { store_id: config.SSLCOMMERZ_STORE_ID, store_passwd: config.SSLCOMMERZ_STORE_PASSWORD };
}

async function responseJson(url: string | URL, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!response.ok) throw new Error("SSLCOMMERZ sandbox request failed");
  return response.json();
}

export type SandboxCheckout = {
  transactionId: string;
  total: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  postcode: string;
};

export async function initiateSandboxCheckout(checkout: SandboxCheckout) {
  const callbackOrigin = new URL(config.PAYMENT_CALLBACK_ORIGIN);
  if (callbackOrigin.protocol !== "https:" || callbackOrigin.pathname !== "/" || callbackOrigin.search || callbackOrigin.hash || callbackOrigin.username || callbackOrigin.password) {
    throw new Error("PAYMENT_CALLBACK_ORIGIN must be an HTTPS origin");
  }
  const fields = {
    ...credentials(),
    total_amount: checkout.total,
    currency: "BDT",
    tran_id: checkout.transactionId,
    success_url: new URL("/api/payments/success", callbackOrigin).href,
    fail_url: new URL("/api/payments/fail", callbackOrigin).href,
    cancel_url: new URL("/api/payments/cancel", callbackOrigin).href,
    ipn_url: new URL("/api/payments/ipn", callbackOrigin).href,
    cus_name: checkout.customerName,
    cus_email: checkout.email,
    cus_phone: checkout.phone,
    cus_add1: checkout.address,
    cus_city: checkout.district,
    cus_postcode: checkout.postcode,
    cus_country: "Bangladesh",
    shipping_method: "Courier",
    ship_name: checkout.customerName,
    ship_add1: checkout.address,
    ship_city: checkout.district,
    ship_postcode: checkout.postcode,
    ship_country: "Bangladesh",
    product_name: "Clothing order",
    product_category: "clothing",
    product_profile: "physical-goods",
  };
  const result = z.object({ status: z.literal("SUCCESS"), sessionkey: z.string().min(1), GatewayPageURL: z.url() }).parse(
    await responseJson(`${sandboxOrigin}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    }),
  );
  const gatewayUrl = new URL(result.GatewayPageURL);
  if (gatewayUrl.origin !== sandboxOrigin || gatewayUrl.username || gatewayUrl.password) throw new Error("Invalid SSLCOMMERZ sandbox checkout URL");
  return { sessionKey: result.sessionkey, gatewayUrl: gatewayUrl.href };
}

export async function validateSandboxPayment(validationId: string) {
  const url = new URL("/validator/api/validationserverAPI.php", sandboxOrigin);
  url.search = new URLSearchParams({ ...credentials(), val_id: validationId, format: "json" }).toString();
  return validationResponse.parse(await responseJson(url));
}

export async function querySandboxTransaction(transactionId: string) {
  const url = new URL("/validator/api/merchantTransIDvalidationAPI.php", sandboxOrigin);
  url.search = new URLSearchParams({ ...credentials(), tran_id: transactionId, format: "json" }).toString();
  return z.object({ APIConnect: z.literal("DONE"), element: z.array(z.object({ status: z.string(), val_id: z.string().optional() })).optional() }).parse(await responseJson(url));
}
