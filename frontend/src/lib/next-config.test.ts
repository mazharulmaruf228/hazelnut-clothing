import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("development origins", () => {
  it("allows only the configured site hostname, without its protocol or port", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.ngrok-free.dev:443");
    const { default: config } = await import("../../next.config");
    expect(config.allowedDevOrigins).toEqual(["example.ngrok-free.dev"]);
  });

  it("defaults to localhost when no site URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { default: config } = await import("../../next.config");
    expect(config.allowedDevOrigins).toEqual(["localhost"]);
  });
});
