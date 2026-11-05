import { systemModel } from "../models/system.model.ts";

export async function checkReadiness() {
  await systemModel.checkDatabase();
  return { status: "ready" };
}
