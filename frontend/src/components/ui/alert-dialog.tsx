import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogAction = AlertDialogPrimitive.Action;

export function AlertDialogContent({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="dialog-overlay-motion fixed inset-0 z-[80] bg-[rgba(20,32,24,0.46)] backdrop-blur-[7px]" />
      <AlertDialogPrimitive.Content
        className={cn(
          "dialog-content-motion fixed left-1/2 top-1/2 z-[90] max-h-[min(90vh,760px)] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-md border border-[rgba(255,255,255,0.92)] bg-[rgba(250,252,249,0.97)] p-7 shadow-[0_24px_70px_rgba(15,32,20,0.25)] backdrop-blur-[20px] backdrop-saturate-[130%]",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn("pr-7 text-xl font-semibold leading-[1.25] text-foreground", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn("mt-2.5 mb-5 text-xs leading-[1.5] text-muted", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-5 flex justify-end gap-[9px]", className)} {...props} />;
}
