import "dotenv/config";
import { z } from "zod";

const production = process.env.NODE_ENV === "production";
export const config = z
  .object({
    NODE_ENV: z.string().default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().default("postgresql://catalogue:change-me@127.0.0.1:55432/catalogue?schema=public"),
    PUBLIC_ORIGIN: z.url().default("http://localhost:3000"),
    ADDITIONAL_ALLOWED_ORIGINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(
        z.array(
          z.url().refine((value) => {
            const url = URL.parse(value);
            return url !== null && (url.protocol === "http:" || url.protocol === "https:") && url.origin === value;
          }, "Expected an HTTP(S) origin without a path or trailing slash"),
        ),
      ),
    JWT_SECRET: z
      .string()
      .min(32)
      .default(production ? "" : "development-only-change-before-production-12345"),
    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),
    GOOGLE_REDIRECT_URI: z.url().default("http://localhost:3000/api/auth/google/callback"),
    CLOUDINARY_CLOUD_NAME: z.string().default(""),
    CLOUDINARY_API_KEY: z.string().default(""),
    CLOUDINARY_API_SECRET: z.string().default(""),
    STRIPE_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    STRIPE_SECRET_KEY: z.string().default(""),
    STRIPE_WEBHOOK_SECRET: z.string().default(""),
  })
  .parse(process.env);
if (production && (!process.env.DATABASE_URL || !process.env.PUBLIC_ORIGIN || !config.PUBLIC_ORIGIN.startsWith("https://"))) {
  throw new Error("Production requires DATABASE_URL and an HTTPS PUBLIC_ORIGIN");
}
export const secureCookies = production;
if (config.STRIPE_SECRET_KEY && !/^[sr]k_test_/.test(config.STRIPE_SECRET_KEY)) {
  throw new Error("This integration only accepts Stripe sandbox/test keys");
}
if (config.STRIPE_ENABLED && (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET.startsWith("whsec_"))) {
  throw new Error("Stripe requires a sandbox API key and webhook signing secret");
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return origin !== undefined && (origin === config.PUBLIC_ORIGIN || config.ADDITIONAL_ALLOWED_ORIGINS.includes(origin));
}
