"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Trash2, X } from "lucide-react";
import { useChangeMutation } from "@/store/api";
import type { AdminUser } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
});
export function UserEditor({ user, self }: { user: AdminUser; self: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [change, { isLoading }] = useChangeMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { name: user.name, email: user.email },
  });
  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="icon" title="Edit user" aria-label={`Edit ${user.name}`}>
            <Pencil size={15} />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="confirm-dialog">
            <Dialog.Title>Edit user</Dialog.Title>
            <Dialog.Description>Changes revoke this account&apos;s existing sessions.</Dialog.Description>
            <form
              className="stack-form"
              onSubmit={handleSubmit(async (values) => {
                setError("");
                try {
                  await change({
                    url: `/admin/users/${user.id}`,
                    method: "PATCH",
                    body: values,
                  }).unwrap();
                  setOpen(false);
                } catch (error) {
                  setError(errorMessage(error));
                }
              })}
            >
              <label>
                Name
                <input {...register("name")} />
              </label>
              <label>
                Email
                <input type="email" {...register("email")} />
              </label>
              {(error || Object.keys(errors).length > 0) && <p className="status-message">{error || "Enter a valid name and email."}</p>}
              <Button disabled={isLoading}>Save user</Button>
            </form>
            <Dialog.Close className="dialog-close" aria-label="Close">
              <X size={16} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {!self && (
        <Confirm
          title={user.approvedAt ? "Delete user?" : "Reject signup?"}
          description="Permanently remove this account and revoke its sessions."
          onConfirm={() =>
            change({
              url: `/admin/users/${user.id}`,
              method: "DELETE",
            }).unwrap()
          }
          trigger={
            <Button variant="ghost" size="icon" title={user.approvedAt ? "Delete user" : "Reject signup"} aria-label={`Delete ${user.name}`}>
              <Trash2 size={15} />
            </Button>
          }
        />
      )}
    </>
  );
}
