import "dotenv/config";
import { z } from "zod";

const production = process.env.NODE_ENV === "production";
export const config = z
  .object({
    NODE_ENV: z.string().default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().default("postgresql://catalogue:change-me@127.0.0.1:55432/catalogue?schema=public"),
    PUBLIC_ORIGIN: z.url().default("http://localhost:3000"),
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
  })
  .parse(process.env);
if (production && (!process.env.DATABASE_URL || !process.env.PUBLIC_ORIGIN || !config.PUBLIC_ORIGIN.startsWith("https://"))) {
  throw new Error("Production requires DATABASE_URL and an HTTPS PUBLIC_ORIGIN");
}
export const secureCookies = production;
