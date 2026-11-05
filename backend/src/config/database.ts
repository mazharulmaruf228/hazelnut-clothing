import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./env.ts";

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});

export async function write<T>(operation: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db.$transaction(
    async (client) => {
      await client.$executeRaw`SELECT pg_advisory_xact_lock(781234567)`;
      return operation(client);
    },
    { timeout: 15_000 },
  );
}
