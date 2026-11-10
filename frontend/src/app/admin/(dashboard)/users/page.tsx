"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Check, KeyRound, UserRoundPlus } from "lucide-react";
import { useMeQuery, useUsersQuery, useChangeMutation } from "@/store/api";
import type { AdminUser } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage } from "@/lib/utils";
import { UserEditor } from "@/components/admin/user-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  password: z.string().min(6).max(200),
  role: z.enum(["ADMIN", "EDITOR"]),
});
function PasswordReset({ user }: { user: AdminUser }) {
  const { data: session } = useMeQuery();
  const [open, setOpen] = useState(false);
  const [change, { isLoading }] = useChangeMutation();
  const [error, setError] = useState("");
  return (
    <>
      <UserEditor user={user} self={session?.user.id === user.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Reset password for ${user.name}`} title="Reset password">
            <KeyRound size={15} />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
          <form
            className="grid gap-5"
            onSubmit={async (event) => {
              event.preventDefault();
              const password = String(new FormData(event.currentTarget).get("password"));
              try {
                await change({
                  url: `/admin/users/${user.id}`,
                  method: "PATCH",
                  body: { password },
                }).unwrap();
                setOpen(false);
              } catch (error) {
                setError(errorMessage(error));
              }
            }}
          >
            <Label>
              New password
              <Input type="password" name="password" minLength={6} maxLength={200} required autoComplete="new-password" />
            </Label>
            {error && (
              <p role="alert" className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
                {error}
              </p>
            )}
            <Button disabled={isLoading}>Reset password</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default function Users() {
  const { data: session } = useMeQuery();
  const { data, error, refetch } = useUsersQuery(undefined, {
    skip: session?.user.role !== "ADMIN",
  });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [change, { isLoading }] = useChangeMutation();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: "EDITOR" },
  });
  async function update(id: string, body: unknown) {
    setMessage("");
    try {
      await change({
        url: `/admin/users/${id}`,
        method: "PATCH",
        body,
      }).unwrap();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }
  if (session?.user.role !== "ADMIN")
    return (
      <div className="grid min-h-[250px] place-items-center px-5 py-20 text-center">
        <h2>Administrator access required.</h2>
      </div>
    );
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-5 max-[700px]:mb-6 max-[700px]:items-start max-[700px]:gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[1.6px] text-muted">Access management</span>
          <h1 className="mt-2 overflow-wrap-anywhere font-sans text-[28px] font-medium leading-[1.2] max-[700px]:text-[25px]">Users</h1>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <UserRoundPlus size={16} /> Add user
        </Button>
      </div>
      {(message || error) && (
        <p className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]" role="alert">
          {message || "Unable to load users."}
          {error && (
            <Button variant="ghost" onClick={refetch}>
              Retry
            </Button>
          )}
        </p>
      )}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="min-w-[180px]">
                  <strong>{user.name}</strong>
                  <small className="mt-1 block text-[10px] text-muted">{user.email}</small>
                </TableCell>
                <TableCell>
                  <Select value={user.role} disabled={isLoading || user.id === session.user.id} onValueChange={(role) => void update(user.id, { role })}>
                    <SelectTrigger aria-label={`Role for ${user.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EDITOR">EDITOR</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={!user.approvedAt ? "warning" : user.isActive ? "positive" : "muted"}>{!user.approvedAt ? "PENDING" : user.isActive ? "ACTIVE" : "DISABLED"}</StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-[3px] whitespace-nowrap">
                    {!user.approvedAt ? (
                      <Button size="sm" variant="outline" disabled={isLoading} onClick={() => void update(user.id, { approve: true })}>
                        <Check size={14} /> Approve
                      </Button>
                    ) : (
                      <Confirm
                        title={user.isActive ? "Disable user?" : "Enable user?"}
                        description="Changing access revokes existing sessions for this account."
                        onConfirm={() =>
                          change({
                            url: `/admin/users/${user.id}`,
                            method: "PATCH",
                            body: { isActive: !user.isActive },
                          }).unwrap()
                        }
                        trigger={
                          <Button size="sm" variant="outline" disabled={user.id === session.user.id}>
                            {user.isActive ? "Disable" : "Enable"}
                          </Button>
                        }
                      />
                    )}
                    <PasswordReset user={user} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {creating && (
        <form
          className="border-t border-line py-[25px]"
          onSubmit={handleSubmit(async (values) => {
            setMessage("");
            try {
              await change({
                url: "/admin/users",
                method: "POST",
                body: values,
              }).unwrap();
              reset();
              setCreating(false);
            } catch (error) {
              setMessage(errorMessage(error));
            }
          })}
        >
          <h2 className="mb-5">New user</h2>
          <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-[700px]:gap-4">
            <Label>
              Name
              <Input {...register("name")} />
            </Label>
            <Label>
              Email
              <Input type="email" {...register("email")} />
            </Label>
            <Label>
              Password
              <Input type="password" autoComplete="new-password" {...register("password")} />
            </Label>
            <Label>
              Role
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EDITOR">EDITOR</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Label>
          </div>
          {Object.keys(errors).length > 0 && <p className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">Enter valid details and a password of at least 6 characters.</p>}
          <div className="mt-[22px] flex flex-wrap items-center gap-3 text-[11px]">
            <Button disabled={isLoading}>
              <Plus size={15} /> Create user
            </Button>
            <Button variant="ghost" type="button" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
