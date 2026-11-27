import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const configUrl = new URL("./config/env.ts", import.meta.url).href;

function loadConfig(overrides: Record<string, string>) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `await import(${JSON.stringify(configUrl)})`], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", PUBLIC_ORIGIN: "https://shop.example.com", ADDITIONAL_ALLOWED_ORIGINS: "", STRIPE_ENABLED: "false", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", ...overrides },
  });
}

describe("sandbox configuration", () => {
  it("accepts only exact HTTP(S) additional origins", () => {
    expect(loadConfig({ ADDITIONAL_ALLOWED_ORIGINS: "http://localhost:4200, https://portfolio.example.com" }).status).toBe(0);
    expect(loadConfig({ ADDITIONAL_ALLOWED_ORIGINS: "http://localhost:4200/" }).status).not.toBe(0);
    expect(loadConfig({ ADDITIONAL_ALLOWED_ORIGINS: "*" }).status).not.toBe(0);
  });
  it("keeps COD available without payment credentials", () => {
    expect(loadConfig({}).status).toBe(0);
  });
  it("requires sandbox Stripe credentials and a webhook secret when enabled", () => {
    expect(loadConfig({ STRIPE_ENABLED: "true" }).status).not.toBe(0);
    expect(loadConfig({ STRIPE_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_configuration_fixture" }).status).not.toBe(0);
    expect(loadConfig({ STRIPE_ENABLED: "true", STRIPE_SECRET_KEY: "rk_test_configuration_fixture", STRIPE_WEBHOOK_SECRET: "whsec_configuration_fixture" }).status).toBe(0);
  }, 20_000);
});
