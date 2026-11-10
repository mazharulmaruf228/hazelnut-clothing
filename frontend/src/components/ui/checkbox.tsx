import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "control-motion inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border border-[#9da99f] bg-[rgba(255,255,255,0.9)] p-0 text-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-green data-[state=checked]:bg-green focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(54,94,74,0.17)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center">
        <Check size={14} strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
