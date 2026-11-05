import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import multer from "multer";
import { HttpError } from "../utils/http-error.ts";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let status = error instanceof HttpError ? error.status : 500;
  let message = status === 500 ? "An unexpected error occurred" : error.message;
  if (error instanceof ZodError) {
    status = 400;
    message = "Validation failed";
  }
  if (error instanceof multer.MulterError) {
    status = 413;
    message = "Upload exceeds the allowed size or count";
  }
  if (error instanceof SyntaxError && "body" in error) {
    status = 400;
    message = "Invalid JSON";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      status = 409;
      message = "Slug, SKU, email or attributes already exist";
    }
    if (error.code === "P2025") {
      status = 404;
      message = "Record not found";
    }
    if (error.code === "P2003") {
      status = 409;
      message = "Record is still referenced or its parent does not exist";
    }
  }
  if (status === 500)
    console.error({
      requestId: res.locals.requestId,
      error: error instanceof Error ? error.message : "Unknown",
    });
  res.status(status).json({
    error: {
      message,
      requestId: res.locals.requestId,
      ...(error instanceof ZodError ? { fields: error.flatten() } : {}),
    },
  });
};
