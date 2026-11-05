"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Check, KeyRound, UserRoundPlus, X } from "lucide-react";
import { useMeQuery, useUsersQuery, useChangeMutation } from "@/store/api";
import type { AdminUser } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage } from "@/lib/utils";
import { UserEditor } from "@/components/admin/user-editor";

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
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Reset password for ${user.name}`} title="Reset password">
            <KeyRound size={15} />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="confirm-dialog">
            <Dialog.Title>Reset password</Dialog.Title>
            <Dialog.Description>{user.email}</Dialog.Description>
            <form
              className="stack-form"
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
              <label>
                New password
                <input type="password" name="password" minLength={6} maxLength={200} required autoComplete="new-password" />
              </label>
              {error && (
                <p role="alert" className="status-message">
                  {error}
                </p>
              )}
              <Button disabled={isLoading}>Reset password</Button>
            </form>
            <Dialog.Close className="dialog-close" aria-label="Close">
              <X size={16} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
      <div className="empty-state">
        <h2>Administrator access required.</h2>
      </div>
    );
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">Access management</span>
          <h1>Users</h1>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <UserRoundPlus size={16} /> Add user
        </Button>
      </div>
      {(message || error) && (
        <p className="status-message" role="alert">
          {message || "Unable to load users."}
          {error && <button onClick={refetch}>Retry</button>}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </td>
                <td>
                  <select value={user.role} aria-label={`Role for ${user.name}`} disabled={isLoading || user.id === session.user.id} onChange={(event) => void update(user.id, { role: event.target.value })}>
                    <option>EDITOR</option>
                    <option>ADMIN</option>
                  </select>
                </td>
                <td>
                  <span className={`status-tag ${user.isActive ? "published" : "draft"}`}>{!user.approvedAt ? "PENDING" : user.isActive ? "ACTIVE" : "DISABLED"}</span>
                </td>
                <td>
                  <div className="row-actions">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && (
        <form
          className="form-section"
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
          <h2>New user</h2>
          <div className="form-grid">
            <label>
              Name
              <input {...register("name")} />
            </label>
            <label>
              Email
              <input type="email" {...register("email")} />
            </label>
            <label>
              Password
              <input type="password" autoComplete="new-password" {...register("password")} />
            </label>
            <label>
              Role
              <select {...register("role")}>
                <option>EDITOR</option>
                <option>ADMIN</option>
              </select>
            </label>
          </div>
          {Object.keys(errors).length > 0 && <p className="status-message">Enter valid details and a password of at least 6 characters.</p>}
          <div className="form-actions">
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
