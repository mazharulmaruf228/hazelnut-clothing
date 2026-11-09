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
      <div className="loading-state" role="status">
        Checking your session...
      </div>
    );
  if (!data)
    return (
      <div className="empty-state">
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
    <div className="admin-layout">
      <aside className="admin-sidebar glass">
        <Link href="/" className="wordmark">
          {storeName}
          <span className="brand-mark" />
        </Link>
        <span className="eyebrow admin-label">Catalogue studio</span>
        <nav aria-label="Admin navigation">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={(item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)) ? "active" : ""}>
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="store-link">
          View storefront <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="admin-body">
        <header className="admin-header glass">
          <span className="muted">Workspace / {items.find((item) => item.href !== "/admin" && pathname.startsWith(item.href))?.label || "Overview"}</span>
          <div>
            <span>
              {data.user.name}
              <small>{data.user.role}</small>
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
        <main className="admin-content">{children}</main>
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
