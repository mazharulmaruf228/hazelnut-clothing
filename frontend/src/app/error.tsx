"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[250px] place-items-center px-5 py-20 text-center">
      <h1>Something went wrong.</h1>
      <p className="my-3 mb-[22px] text-muted">Please try again in a moment.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
