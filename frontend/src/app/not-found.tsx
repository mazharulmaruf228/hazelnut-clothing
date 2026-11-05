import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-state">
      <span className="eyebrow">404</span>
      <h1>This piece isn&apos;t here.</h1>
      <p>It may have moved or is no longer published.</p>
      <Link href="/products">Back to the collection</Link>
    </main>
  );
}
