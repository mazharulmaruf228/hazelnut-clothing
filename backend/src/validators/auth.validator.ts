import { z } from "zod";

export const credentials = z
  .object({
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(200),
  })
  .strict();
export const newUser = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(6).max(200),
    role: z.enum(["ADMIN", "EDITOR"]).default("EDITOR"),
  })
  .strict();
export const passwordInput = z
  .object({
    currentPassword: z.string().max(200),
    password: z.string().min(6).max(200),
  })
  .strict();
export const userPatch = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    role: z.enum(["ADMIN", "EDITOR"]).optional(),
    isActive: z.boolean().optional(),
    approve: z.boolean().optional(),
    password: z.string().min(6).max(200).optional(),
  })
  .strict();
