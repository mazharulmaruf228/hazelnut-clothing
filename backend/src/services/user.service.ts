import argon2 from "argon2";
import type { AdminUser } from "@prisma/client";
import type { z } from "zod";
import { write } from "../config/database.ts";
import { HttpError } from "../utils/http-error.ts";
import { userModel } from "../models/user.model.ts";
import { sessionModel } from "../models/session.model.ts";
import type { newUser, userPatch } from "../validators/auth.validator.ts";

export const safeUser = (user: AdminUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  approvedAt: user.approvedAt,
});

export async function listUsers() {
  return (await userModel.list()).map(safeUser);
}

export async function createUser(input: z.infer<typeof newUser>) {
  const { password, ...data } = input;
  return safeUser(
    await userModel.create({
      ...data,
      passwordHash: await argon2.hash(password),
      approvedAt: new Date(),
      isActive: true,
    }),
  );
}

export async function updateUser(id: string, input: z.infer<typeof userPatch>) {
  const passwordHash = input.password ? await argon2.hash(input.password) : undefined;
  return write(async (client) => {
    const existing = await userModel.findById(id, client);
    const removingAdmin = input.role === "EDITOR" || input.isActive === false;
    if (existing.role === "ADMIN" && existing.isActive && removingAdmin && (await userModel.countActiveAdmins(client)) <= 1) {
      throw new HttpError(409, "Cannot disable or demote the last active administrator");
    }
    const user = await userModel.update(
      id,
      {
        name: input.name,
        email: input.email,
        role: input.role,
        isActive: input.approve ? true : input.isActive,
        approvedAt: input.approve ? new Date() : undefined,
        passwordHash,
      },
      client,
    );
    await sessionModel.deleteForUser(id, client);
    return safeUser(user);
  });
}

export async function deleteUser(id: string) {
  await write(async (client) => {
    const user = await userModel.findById(id, client);
    if (user.role === "ADMIN" && user.isActive && (await userModel.countActiveAdmins(client)) <= 1) throw new HttpError(409, "Cannot delete the last active administrator");
    await userModel.delete(id, client);
  });
}
