"use client";
import { useState } from "react";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import { errorMessage } from "@/lib/utils";

export function Confirm({ trigger, title, description, onConfirm }: { trigger: React.ReactNode; title: string; description: string; onConfirm: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle className="font-sans text-xl font-[550]">{title}</DialogTitle>
        <DialogDescription className="mt-3 mb-[22px] text-[13px] text-muted">{description}</DialogDescription>
        {error && (
          <p className="mt-[15px] rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]" role="alert">
            {error}
          </p>
        )}
        <div className="mt-[22px] flex flex-wrap items-center gap-3 text-[11px]">
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? "Working..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
