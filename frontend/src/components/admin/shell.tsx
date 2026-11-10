"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, FolderTree, Users, LogOut, ArrowUpRight, Settings, ShoppingCart } from "lucide-react";
import { useMeQuery, useLogoutMutation, catalogueApi } from "@/store/api";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { storeName } from "@/lib/site";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, refetch } = useMeQuery();
  const [logout] = useLogoutMutation();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const [logoutError, setLogoutError] = useState(false);
  const unauthorized = error && "status" in error && error.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/admin/login");
  }, [unauthorized, router]);
  if (isLoading || unauthorized)
    return (
      <div className="grid min-h-screen place-items-center p-20 text-center text-muted" role="status">
        Checking your session...
      </div>
    );
  if (!data)
    return (
      <div className="grid min-h-[250px] place-items-center px-5 py-20 text-center">
        <h1>Unable to connect.</h1>
        <p>The admin service is unavailable.</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  const items = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
    ...(data.user.role === "ADMIN" ? [{ href: "/admin/users", label: "Users", icon: Users }] : []),
    { href: "/admin/account", label: "Account", icon: Settings },
  ];
  return (
    <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)] bg-[linear-gradient(125deg,#f3f5ef,#f4f6f7_65%,#eef3ef)] max-[1050px]:grid-cols-[180px_minmax(0,1fr)] max-[700px]:block">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-line bg-glass-surface px-[25px] py-[33px] shadow-[0_12px_36px_rgba(31,53,39,0.08)] backdrop-blur-[24px] backdrop-saturate-[145%] max-[1050px]:px-[18px] max-[1050px]:py-7 max-[700px]:z-[30] max-[700px]:h-auto max-[700px]:border-r-0 max-[700px]:border-b max-[700px]:border-line max-[700px]:bg-[#f9fbf5eb] max-[700px]:px-[5%] max-[700px]:pt-[15px] max-[700px]:pb-0">
        <Link href="/" className="inline-flex items-center gap-[5px] font-editorial text-[32px] font-bold leading-none max-[700px]:text-[26px]">
          {storeName}
          <span className="mb-1 h-[5px] w-[5px] self-end bg-coral" />
        </Link>
        <span className="mb-[35px] mt-[18px] text-[9px] text-muted max-[700px]:hidden">CATALOGUE STUDIO</span>
        <nav className="grid gap-[7px] max-[700px]:mt-[14px] max-[700px]:flex max-[700px]:gap-1 max-[700px]:overflow-auto" aria-label="Admin navigation">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-motion flex items-center gap-3 rounded-[4px] p-3 text-xs max-[700px]:shrink-0 max-[700px]:gap-[7px] max-[700px]:px-3 max-[700px]:py-2.5 max-[700px]:text-[11px] max-[700px]:whitespace-nowrap max-[700px]:[&_svg]:w-[14px] ${(item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)) ? "bg-[#e2ebe2] font-semibold text-[#234d36]" : "text-muted hover:bg-[rgba(255,255,255,0.55)] hover:text-green"}`}
            >
              <item.icon className="shrink-0" size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="mt-auto flex justify-between pt-[30px] text-xs max-[700px]:hidden">
          View storefront <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-[25] flex h-[78px] items-center justify-between gap-[15px] border-b border-line bg-glass-surface px-[35px] py-[15px] text-xs shadow-[0_12px_36px_rgba(31,53,39,0.08)] backdrop-blur-[24px] backdrop-saturate-[145%] max-[1050px]:px-[25px] max-[700px]:static max-[700px]:h-[65px] max-[700px]:px-[5%] max-[700px]:py-3 max-[700px]:text-[10px]">
          <span className="text-muted">Workspace / {items.find((item) => item.href !== "/admin" && pathname.startsWith(item.href))?.label || "Overview"}</span>
          <div className="flex items-center gap-4 max-[700px]:gap-[5px]">
            <span>
              {data.user.name}
              <small className="block text-[9px] text-muted">{data.user.role}</small>
            </span>
            <Button
              variant="ghost"
              size="icon"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await logout().unwrap();
                  dispatch(catalogueApi.util.resetApiState());
                  router.replace("/admin/login");
                } catch {
                  setLogoutError(true);
                }
              }}
            >
              <LogOut size={17} />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1450px] p-[35px] max-[1050px]:p-[25px] max-[700px]:px-[5%] max-[700px]:py-[25px]">{children}</main>
      </div>
      <AlertDialog open={logoutError} onOpenChange={setLogoutError}>
        <AlertDialogContent>
          <AlertDialogTitle>Sign out failed</AlertDialogTitle>
          <AlertDialogDescription>Please try signing out again.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button>Close</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
