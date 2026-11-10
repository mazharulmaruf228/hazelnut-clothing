import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "control-motion min-h-[110px] w-full min-w-0 resize-y rounded-[4px] border border-line bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-foreground outline-offset-4 focus-visible:border-[#547961] focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(54,94,74,0.14)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#edf0ec] disabled:text-[#78827b]",
        className,
      )}
      {...props}
    />
  );
}
