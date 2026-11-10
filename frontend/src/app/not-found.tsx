import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-[250px] place-items-center px-5 py-20 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">404</span>
      <h1>This piece isn&apos;t here.</h1>
      <p className="my-3 mb-[22px] text-muted">It may have moved or is no longer published.</p>
      <Link className="inline-flex items-center gap-2.5 border-b border-current" href="/products">
        Back to the collection
      </Link>
    </main>
  );
}
