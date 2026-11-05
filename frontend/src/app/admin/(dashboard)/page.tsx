"use client";
import Link from "next/link";
import { Package, CheckCircle2, FilePenLine, FolderTree, Plus, ArrowUpRight } from "lucide-react";
import { useOverviewQuery, useProductsQuery } from "@/store/api";
import { Button } from "@/components/ui/button";
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
      <div className="admin-title">
        <div>
          <span className="eyebrow">Your catalogue, at a glance</span>
          <h1>Overview</h1>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus size={16} /> Add product
          </Link>
        </Button>
      </div>
      {error && (
        <div className="status-message">
          Unable to load overview. <Button variant="ghost" onClick={refetch}>Retry</Button>
        </div>
      )}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.key} className="stat-item">
            <stat.icon size={19} />
            <span>{stat.label}</span>
            <strong>{isLoading ? "..." : (data?.[stat.key] ?? "-")}</strong>
          </div>
        ))}
      </div>
      {!!data?.pendingUsers && (
        <Link href="/admin/users" className="approval-notice">
          {data.pendingUsers} account(s) awaiting approval <ArrowUpRight size={16} />
        </Link>
      )}
      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Recent products</h2>
          <Link href="/admin/products">
            View all <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products?.items.map((product) => (
                <tr key={product.id}>
                  <td>
                    <Link href={`/admin/products/${product.id}`}>{product.name}</Link>
                  </td>
                  <td>{product.category.name}</td>
                  <td>{money(product.fromPrice)}</td>
                  <td>
                    <span className={`status-tag ${product.status.toLowerCase()}`}>{product.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products?.total === 0 && <p className="empty-state">Your catalogue is ready for its first product.</p>}
      </section>
    </>
  );
}
