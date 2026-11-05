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
    <main className="login-page">
      <Link href="/" className="back-link">
        <ArrowLeft size={16} /> Back to the collection
      </Link>
      <section className="login-panel glass">
        <Link href="/" className="wordmark">
          {storeName}
          <span className="brand-mark" />
        </Link>
        <div className="login-heading">
          <LockKeyhole size={22} />
          <span className="eyebrow">Catalogue studio</span>
          <h1>Welcome back.</h1>
        </div>
        {params.has("pending") && (
          <p role="status" className="status-message success">
            Your Google account is awaiting administrator approval.
          </p>
        )}
        {googleError && (
          <p role="alert" className="status-message">
            {googleError === "google-unavailable" ? "Google sign-in is not configured yet." : googleError === "use-password" ? "This email already has an account. Sign in with your password." : "Google sign-in failed. Please try again."}
          </p>
        )}
        {error && (
          <p className="status-message" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit(submit)} className="stack-form">
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
        <div className="login-divider">
          <span>or</span>
        </div>
        <Button asChild variant="outline">
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
    <Suspense fallback={<div className="loading-state">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
