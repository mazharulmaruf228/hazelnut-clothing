import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://catalogue:change-me@127.0.0.1:55432/catalogue?schema=public",
  },
});
