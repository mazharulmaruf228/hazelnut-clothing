import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean };

export function DialogContent({ className, children, showCloseButton = true, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay-motion fixed inset-0 z-[80] bg-[rgba(20,32,24,0.46)] backdrop-blur-[7px]" />
      <DialogPrimitive.Content
        className={cn(
          "dialog-content-motion fixed left-1/2 top-1/2 z-[90] max-h-[min(90vh,760px)] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-md border border-[rgba(255,255,255,0.92)] bg-[rgba(250,252,249,0.97)] p-7 shadow-[0_24px_70px_rgba(15,32,20,0.25)] backdrop-blur-[20px] backdrop-saturate-[130%]",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-line bg-[rgba(255,255,255,0.78)] p-0 text-foreground" aria-label="Close dialog">
            <X size={17} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pr-7 text-xl font-semibold leading-[1.25] text-foreground", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-2.5 mb-5 text-xs leading-[1.5] text-muted", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-5 flex justify-end gap-[9px]", className)} {...props} />;
}
