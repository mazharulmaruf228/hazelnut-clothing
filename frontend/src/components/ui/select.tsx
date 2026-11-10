import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "control-motion inline-flex min-h-[42px] w-full min-w-0 items-center justify-between gap-2.5 rounded-[4px] border border-line bg-[rgba(255,255,255,0.84)] px-[11px] py-[9px] text-left text-xs text-foreground data-[placeholder]:text-muted focus-visible:border-[#547961] focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(54,94,74,0.14)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#edf0ec] disabled:text-[#78827b]",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={16} aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, position = "popper", ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "select-content-motion z-[100] max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-[rgba(255,255,255,0.92)] bg-[rgba(250,252,249,0.97)] p-[5px] shadow-[0_14px_36px_rgba(24,42,30,0.18)] backdrop-blur-[18px] backdrop-saturate-[135%]",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex justify-center p-[3px] text-muted">
          <ChevronUp size={14} />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-0.5">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex justify-center p-[3px] text-muted">
          <ChevronDown size={14} />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex min-h-9 cursor-pointer select-none items-center rounded-[4px] py-[7px] pl-2.5 pr-[30px] text-xs text-foreground outline-none data-[highlighted]:bg-[#e7eee8] data-[highlighted]:text-[#294d3a] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-[9px] inline-flex text-green">
        <Check size={14} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn("mx-0.5 my-1 h-px bg-line", className)} {...props} />;
}
