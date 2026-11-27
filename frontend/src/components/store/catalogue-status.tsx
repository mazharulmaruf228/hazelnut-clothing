"use client";

import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CatalogueLoading() {
  return <p role="status" className="min-h-[250px] px-5 py-20 text-center">Loading the collection...</p>;
}

export function CatalogueError({ error, retry, updating = false }: {
  error: FetchBaseQueryError | SerializedError;
  retry: () => void;
  updating?: boolean;
}) {
  let message = "The catalogue request failed. Please try again.";
  if ("status" in error) {
    if (error.status === "CUSTOM_ERROR") message = error.error;
    else if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") message = "We couldn't reach the catalogue API. Please try again.";
    else if (error.status === "PARSING_ERROR") message = "The catalogue API returned an unreadable response.";
    else if (typeof error.status === "number") message = `The catalogue API returned HTTP ${error.status}. Please try again.`;
  }
  return (
    <div role="alert" className="grid gap-3 px-5 py-8 text-center">
      <p>{message}</p>
      <Button variant="outline" onClick={retry} disabled={updating} className="justify-self-center">
        <RotateCcw size={16} /> {updating ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}
