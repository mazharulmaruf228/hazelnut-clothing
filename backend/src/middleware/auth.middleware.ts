import type { RequestHandler } from "express";
import type { AdminUser } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { config } from "../config/env.ts";
import { HttpError } from "../utils/http-error.ts";
import { authenticate } from "../services/auth.service.ts";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.admin = await authenticate(req.cookies.access ?? "");
    next();
  } catch (error) {
    next(error);
  }
};

export const adminOnly: RequestHandler = (req, _res, next) => {
  if (req.admin?.role !== "ADMIN") return next(new HttpError(403, "Administrator access required"));
  next();
};

export const csrf: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const token = Buffer.from(req.get("x-csrf-token") ?? "");
  const expected = Buffer.from(req.cookies.csrf ?? "");
  if (req.get("origin") !== config.PUBLIC_ORIGIN || !token.length || token.length !== expected.length || !timingSafeEqual(token, expected)) {
    return next(new HttpError(403, "Invalid request origin or CSRF token"));
  }
  next();
};
