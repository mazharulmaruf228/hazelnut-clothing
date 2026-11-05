import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { AdminUser, Product, ProductList, Category } from "@/schemas/api";

let csrfToken: string | undefined;
let csrfRequest: Promise<string> | undefined;
async function getCsrf() {
  if (csrfToken) return csrfToken;
  csrfRequest ??= fetch("/api/auth/csrf", { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to secure the request");
      csrfToken = (await response.json()).token;
      return csrfToken!;
    })
    .finally(() => {
      csrfRequest = undefined;
    });
  return csrfRequest;
}
const raw = fetchBaseQuery({ baseUrl: "/api", credentials: "same-origin" });
let refreshRequest: Promise<boolean> | undefined;
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const input = typeof args === "string" ? { url: args } : args;
  async function execute(request: FetchArgs) {
    const headers = new Headers();
    if (request.headers instanceof Headers) request.headers.forEach((value, name) => headers.set(name, value));
    else if (Array.isArray(request.headers)) {
      for (const [name, value] of request.headers) if (name && value !== undefined) headers.set(name, value);
    } else {
      for (const [name, value] of Object.entries(request.headers ?? {})) if (value !== undefined) headers.set(name, value);
    }
    if (!["GET", "HEAD"].includes((request.method || "GET").toUpperCase())) headers.set("x-csrf-token", await getCsrf());
    return raw({ ...request, headers }, api, extra);
  }
  try {
    let result = await execute(input);
    if (result.error?.status === 401 && !input.url.startsWith("/auth/login") && !input.url.startsWith("/auth/logout")) {
      refreshRequest ??= execute({ url: "/auth/refresh", method: "POST" })
        .then((result) => !result.error)
        .finally(() => {
          refreshRequest = undefined;
        });
      if (await refreshRequest) result = await execute(input);
    }
    if (result.error?.status === 403) csrfToken = undefined;
    return result;
  } catch (error) {
    return {
      error: {
        status: "CUSTOM_ERROR",
        error: error instanceof Error ? error.message : "Network error",
      },
    };
  }
};
export const catalogueApi = createApi({
  reducerPath: "catalogueApi",
  baseQuery,
  tagTypes: ["Catalogue", "Users", "Session"],
  endpoints: (builder) => ({
    me: builder.query<{ user: AdminUser }, void>({
      query: () => "/auth/me",
      providesTags: ["Session"],
    }),
    login: builder.mutation<{ user: AdminUser }, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Session"],
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      invalidatesTags: ["Session"],
    }),
    overview: builder.query<Record<string, number>, void>({
      query: () => "/admin/overview",
      providesTags: ["Catalogue", "Users"],
    }),
    products: builder.query<ProductList, string>({
      query: (query) => `/admin/products?${query}`,
      providesTags: ["Catalogue"],
    }),
    product: builder.query<Product, string>({
      query: (id) => `/admin/products/${id}`,
      providesTags: ["Catalogue"],
    }),
    categories: builder.query<{ items: Category[] }, void>({
      query: () => "/admin/categories",
      providesTags: ["Catalogue"],
    }),
    users: builder.query<{ items: AdminUser[] }, void>({
      query: () => "/admin/users",
      providesTags: ["Users"],
    }),
    change: builder.mutation<unknown, { url: string; method: "POST" | "PATCH" | "DELETE"; body?: unknown }>({ query: (input) => input, invalidatesTags: ["Catalogue", "Users"] }),
    upload: builder.mutation<unknown, FormData>({
      query: (body) => ({ url: "/admin/uploads", method: "POST", body }),
      invalidatesTags: ["Catalogue"],
    }),
  }),
});
export const { useMeQuery, useLoginMutation, useLogoutMutation, useOverviewQuery, useProductsQuery, useProductQuery, useCategoriesQuery, useUsersQuery, useChangeMutation, useUploadMutation } = catalogueApi;
