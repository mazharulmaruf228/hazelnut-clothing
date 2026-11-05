import { productModel } from "../models/product.model.ts";
import { categoryModel } from "../models/category.model.ts";
import { userModel } from "../models/user.model.ts";

export async function getOverview(includeUsers: boolean) {
  const [products, published, drafts, categories] = await Promise.all([productModel.count(), productModel.count("PUBLISHED"), productModel.count("DRAFT"), categoryModel.count()]);
  return {
    products,
    published,
    drafts,
    categories,
    ...(includeUsers ? { pendingUsers: await userModel.countPending() } : {}),
  };
}
