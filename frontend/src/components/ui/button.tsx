import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex min-h-10 items-center justify-center gap-2 whitespace-normal rounded-[4px] border border-transparent px-[15px] py-[9px] text-center text-xs font-[550] disabled:cursor-not-allowed disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-green text-white hover:brightness-[0.96]",
      outline: "border-line bg-[#ffffff90] text-foreground hover:brightness-[0.96]",
      ghost: "bg-transparent text-foreground hover:brightness-[0.96]",
      destructive: "bg-[#b64436] text-white hover:brightness-[0.96]",
    },
    size: { default: "", icon: "h-10 w-10 shrink-0 p-0", sm: "min-h-8 px-2.5 py-[5px]" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({ className, variant, size, asChild, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(variants({ variant, size }), className)} {...props} />;
}
