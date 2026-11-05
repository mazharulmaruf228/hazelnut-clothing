"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Link2 } from "lucide-react";
import { useChangeMutation, useMeQuery } from "@/store/api";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(6).max(200),
});
export default function Account() {
  const { data } = useMeQuery();
  const [change, { isLoading }] = useChangeMutation();
  const [error, setError] = useState("");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">Personal settings</span>
          <h1>Account</h1>
        </div>
      </div>
      <section className="form-section">
        <h2>{data?.user.name}</h2>
        <p className="muted">
          {data?.user.email} / {data?.user.role}
        </p>
        <div className="form-actions">
          <Button asChild variant="outline">
            <a href="/api/auth/google/link">
              <Link2 size={16} /> Link Google account
            </a>
          </Button>
        </div>
      </section>
      <form
        className="form-section account-form"
        onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            await change({
              url: "/auth/password",
              method: "POST",
              body: values,
            }).unwrap();
            router.replace("/admin/login");
          } catch (error) {
            setError(errorMessage(error));
          }
        })}
      >
        <h2>Change password</h2>
        <div className="stack-form">
          <Label>
            Current password
            <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
          </Label>
          <Label>
            New password
            <Input type="password" autoComplete="new-password" {...register("password")} />
          </Label>
          {(error || Object.keys(errors).length > 0) && (
            <p className="status-message" role="alert">
              {error || "Use a new password of at least 6 characters."}
            </p>
          )}
          <Button disabled={isLoading}>
            <KeyRound size={16} /> Change password
          </Button>
        </div>
      </form>
    </>
  );
}
