import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const configUrl = new URL("./config/env.ts", import.meta.url).href;

function loadConfig(overrides: Record<string, string>) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `await import(${JSON.stringify(configUrl)})`], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", PUBLIC_ORIGIN: "https://shop.example.com", PAYMENT_MODE: "offline", SSLCOMMERZ_STORE_ID: "", SSLCOMMERZ_STORE_PASSWORD: "", PAYMENT_CALLBACK_ORIGIN: "", ...overrides },
  });
}

describe("sandbox configuration", () => {
  it("keeps offline mode available without payment credentials", () => {
    expect(loadConfig({}).status).toBe(0);
  });
  it("rejects sandbox mode without credentials or with a different callback origin", () => {
    expect(loadConfig({ PAYMENT_MODE: "sslcommerz_sandbox" }).status).not.toBe(0);
    expect(loadConfig({ PAYMENT_MODE: "sslcommerz_sandbox", SSLCOMMERZ_STORE_ID: "test", SSLCOMMERZ_STORE_PASSWORD: "test", PAYMENT_CALLBACK_ORIGIN: "https://different.example.com" }).status).not.toBe(0);
    expect(loadConfig({ PAYMENT_MODE: "sslcommerz_sandbox", SSLCOMMERZ_STORE_ID: "test", SSLCOMMERZ_STORE_PASSWORD: "test", PAYMENT_CALLBACK_ORIGIN: "https://shop.example.com" }).status).toBe(0);
  }, 20_000);
});
