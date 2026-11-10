"use client";
import Link from "next/link";
import { Package, CheckCircle2, FilePenLine, FolderTree, Plus, ArrowUpRight } from "lucide-react";
import { useOverviewQuery, useProductsQuery } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { money } from "@/lib/utils";

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useOverviewQuery();
  const { data: products } = useProductsQuery("pageSize=5");
  const stats = [
    { key: "products", label: "Total products", icon: Package },
    { key: "published", label: "Published", icon: CheckCircle2 },
    { key: "drafts", label: "Drafts", icon: FilePenLine },
    { key: "categories", label: "Categories", icon: FolderTree },
  ];
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-5 max-[700px]:mb-6 max-[700px]:items-start max-[700px]:gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[1.6px] text-muted">Your catalogue, at a glance</span>
          <h1 className="mt-2 overflow-wrap-anywhere font-sans text-[28px] font-medium leading-[1.2] max-[700px]:text-[25px]">Overview</h1>
        </div>
        <Button className="max-[700px]:px-2.5 max-[700px]:py-2" asChild>
          <Link href="/admin/products/new">
            <Plus size={16} /> Add product
          </Link>
        </Button>
      </div>
      {error && (
        <div className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
          Unable to load overview.{" "}
          <Button variant="ghost" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}
      <div className="grid grid-cols-4 gap-[18px] max-[1050px]:gap-2.5 max-[700px]:grid-cols-2 max-[700px]:gap-3">
        {stats.map((stat) => (
          <div key={stat.key} className="stat-item-motion grid grid-cols-[1fr_auto] gap-4 rounded-md border border-[#dce4da] bg-[rgba(255,255,255,0.66)] p-5 shadow-[0_10px_28px_rgba(35,54,41,0.05)] backdrop-blur-[16px] backdrop-saturate-[125%] max-[1050px]:p-[15px] max-[700px]:p-[15px]">
            <stat.icon className="col-start-2 row-start-1 text-green" size={19} />
            <span className="col-start-1 row-start-1 text-xs text-muted max-[1050px]:text-[10px]">{stat.label}</span>
            <strong className="text-[32px] font-medium max-[700px]:text-[28px]">{isLoading ? "..." : (data?.[stat.key] ?? "-")}</strong>
          </div>
        ))}
      </div>
      {!!data?.pendingUsers && (
        <Link href="/admin/users" className="mt-[25px] flex items-center gap-5 border-l-[3px] border-green bg-[#e4eee5] p-4 text-xs">
          {data.pendingUsers} account(s) awaiting approval <ArrowUpRight size={16} />
        </Link>
      )}
      <section className="mt-[35px] border-t border-line pt-[25px]">
        <div className="mb-5 flex items-center justify-between gap-[15px]">
          <h2 className="font-sans text-[17px] font-[550] leading-[1.3]">Recent products</h2>
          <Link className="flex items-center gap-[7px] text-xs" href="/admin/products">
            View all <ArrowUpRight size={15} />
          </Link>
        </div>
        <TableContainer>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {products?.items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="min-w-[180px]">
                    <Link href={`/admin/products/${product.id}`}>{product.name}</Link>
                  </TableCell>
                  <TableCell>{product.category.name}</TableCell>
                  <TableCell>{money(product.fromPrice)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={product.status === "PUBLISHED" ? "positive" : product.status === "DRAFT" ? "warning" : "muted"}>{product.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {products?.total === 0 && <p className="min-h-[250px] px-5 py-20 text-center">Your catalogue is ready for its first product.</p>}
      </section>
    </>
  );
}
