"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, LockKeyhole } from "lucide-react";
import { useLoginMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils";
import { storeName } from "@/lib/site";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.email(), password: z.string().min(1) });
function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const googleError = params.get("error");
  async function submit(values: z.infer<typeof schema>) {
    setError("");
    try {
      await login(values).unwrap();
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <main className="min-h-screen bg-[linear-gradient(125deg,#edf3e9,#f2f5f8_65%,#e6eeea)] px-[5%] py-[30px]">
      <Link href="/" className="mb-[22px] inline-flex items-center gap-2 text-xs">
        <ArrowLeft size={16} /> Back to the collection
      </Link>
      <section className="mx-auto mt-[50px] max-w-[420px] rounded-md border border-white bg-glass-surface p-[35px] shadow-[0_12px_50px_rgba(41,72,51,0.07)] backdrop-blur-[24px] backdrop-saturate-[145%] max-[700px]:mt-[25px] max-[700px]:px-6 max-[700px]:py-7">
        <Link href="/" className="inline-flex items-center gap-[5px] font-editorial text-[32px] font-bold leading-none">
          {storeName}
          <span className="mb-1 h-[5px] w-[5px] self-end bg-coral" />
        </Link>
        <div className="mt-[35px] mb-[25px]">
          <LockKeyhole className="mb-3 text-green" size={22} />
          <span className="block text-[10px] font-semibold uppercase tracking-[1.6px] text-muted">Catalogue studio</span>
          <h1 className="mt-2.5 text-[40px] max-[700px]:text-4xl">Welcome back.</h1>
        </div>
        {params.has("pending") && (
          <p role="status" className="mb-5 rounded-[4px] border border-[#b9d1bf] bg-[#eff7ef] p-3 text-xs text-[#285039]">
            Your Google account is awaiting administrator approval.
          </p>
        )}
        {googleError && (
          <p role="alert" className="mb-5 rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
            {googleError === "google-unavailable" ? "Google sign-in is not configured yet." : googleError === "use-password" ? "This email already has an account. Sign in with your password." : "Google sign-in failed. Please try again."}
          </p>
        )}
        {error && (
          <p className="mb-5 rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit(submit)} className="grid gap-5">
          <Label>
            Email
            <Input type="email" autoComplete="username" {...register("email")} />
            {errors.email && <span className="field-error">Enter a valid email address</span>}
          </Label>
          <Label>
            Password
            <Input type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <span className="field-error">Password is required</span>}
          </Label>
          <Button disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
            <ArrowRight size={16} />
          </Button>
        </form>
        <div className="relative my-[30px] mb-[22px] border-t border-line text-center">
          <span className="relative -top-3 bg-[#f5f7f3] px-[15px] text-xs text-muted">or</span>
        </div>
        <Button className="w-full" asChild variant="outline">
          <a href="/api/auth/google">
            Continue with Google <ArrowUpRightIcon />
          </a>
        </Button>
      </section>
    </main>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} />;
}
export default function Login() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center p-20 text-center text-muted">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
