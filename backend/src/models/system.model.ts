import { db } from "../config/database.ts";

export const systemModel = {
  checkDatabase: () => db.$queryRaw`SELECT 1`,
};
