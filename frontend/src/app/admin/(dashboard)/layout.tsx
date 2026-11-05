import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.has("access") && !cookieStore.has("refresh")) redirect("/admin/login");
  return <AdminShell>{children}</AdminShell>;
}
