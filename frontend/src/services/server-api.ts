import { z } from "zod";
import { categoryListSchema, productListSchema, productSchema } from "@/schemas/api";

const origin = process.env.API_INTERNAL_URL || "http://localhost:4000";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${origin}/api${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError(503, "The catalogue is temporarily unavailable.");
  }
  if (!response.ok) throw new ApiError(response.status, "The catalogue is temporarily unavailable.");
  return schema.parse(await response.json());
}
export const getProducts = (query = "") => get(`/products${query ? `?${query}` : ""}`, productListSchema);
export const getCategories = () => get("/categories", categoryListSchema);
export const getProduct = (slug: string) => get(`/products/${encodeURIComponent(slug)}`, productSchema);
