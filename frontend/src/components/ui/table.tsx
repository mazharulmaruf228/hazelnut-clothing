import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function TableContainer({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("w-full overflow-auto rounded-[4px] border border-line bg-[rgba(255,255,255,0.58)] backdrop-blur-[14px]", className)} {...props} />;
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse text-left text-xs", className)} {...props} />;
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={className} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("whitespace-nowrap bg-[#eef2ec] px-4 py-[14px] text-left text-[10px] font-[550] uppercase tracking-[0.7px] text-muted", className)} {...props} />;
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("min-w-[95px] border-t border-[#e3e7df] px-4 py-[13px] align-middle", className)} {...props} />;
}
