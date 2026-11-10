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
      <div className="mb-8 flex items-center justify-between gap-5 max-[700px]:mb-6 max-[700px]:items-start max-[700px]:gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[1.6px] text-muted">Personal settings</span>
          <h1 className="mt-2 overflow-wrap-anywhere font-sans text-[28px] font-medium leading-[1.2] max-[700px]:text-[25px]">Account</h1>
        </div>
      </div>
      <section className="border-t border-line py-[25px]">
        <h2 className="mb-5">{data?.user.name}</h2>
        <p className="text-muted">
          {data?.user.email} / {data?.user.role}
        </p>
        <div className="mt-[22px] flex flex-wrap items-center gap-3 text-[11px]">
          <Button asChild variant="outline">
            <a href="/api/auth/google/link">
              <Link2 size={16} /> Link Google account
            </a>
          </Button>
        </div>
      </section>
      <form
        className="max-w-[650px] border-t border-line py-[25px]"
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
        <h2 className="mb-5">Change password</h2>
        <div className="grid gap-5">
          <Label>
            Current password
            <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
          </Label>
          <Label>
            New password
            <Input type="password" autoComplete="new-password" {...register("password")} />
          </Label>
          {(error || Object.keys(errors).length > 0) && (
            <p className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]" role="alert">
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
