"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2 } from "lucide-react";
import { useChangeMutation } from "@/store/api";
import type { AdminUser } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Edit user" aria-label={`Edit ${user.name}`}>
            <Pencil size={15} />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Changes revoke this account&apos;s existing sessions.</DialogDescription>
          <form
            className="grid gap-5"
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
            <Label>
              Name
              <Input {...register("name")} />
            </Label>
            <Label>
              Email
              <Input type="email" {...register("email")} />
            </Label>
            {(error || Object.keys(errors).length > 0) && <p className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">{error || "Enter a valid name and email."}</p>}
            <Button disabled={isLoading}>Save user</Button>
          </form>
        </DialogContent>
      </Dialog>
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
