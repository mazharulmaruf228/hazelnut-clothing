import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "./config/database.ts";
import { newUser } from "./validators/auth.validator.ts";
import { createUser } from "./services/user.service.ts";

const prompt = createInterface({ input: stdin, output: stdout });
try {
  const email = await prompt.question("Admin email: ");
  const name = await prompt.question("Admin name: ");
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Set ADMIN_PASSWORD in your terminal environment before running this command. Do not pass passwords as CLI arguments.");
  const input = newUser.parse({ email, name, password, role: "ADMIN" });
  await createUser(input);
  console.log("Administrator created");
} finally {
  prompt.close();
  await db.$disconnect();
}
