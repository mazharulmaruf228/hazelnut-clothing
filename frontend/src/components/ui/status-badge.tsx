import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "warning" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-[#e8e9e6] text-foreground",
  positive: "bg-[#e0ede1] text-[#2d5a39]",
  warning: "bg-[#fff0d6] text-[#805d1b]",
  muted: "bg-[#ece8e5] text-[#6b5c53]",
};

export function StatusBadge({ className, tone = "neutral", ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-[5px] whitespace-nowrap rounded-[3px] px-[7px] py-1 text-[9px] font-semibold", tones[tone], className)} {...props} />;
}
