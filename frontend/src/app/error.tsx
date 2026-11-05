"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state">
      <h1>Something went wrong.</h1>
      <p>Please try again in a moment.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
