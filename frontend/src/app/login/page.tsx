"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GOOGLE_LOGIN_URL } from "@/lib/api";
import { useMe } from "@/hooks/useAuth";
import { Button, buttonClasses } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/ui/GoogleIcon";

const inputClasses =
  "w-full rounded-lg bg-surface px-4 py-3 text-sm placeholder:text-muted outline-none disabled:cursor-not-allowed";

export default function LoginPage() {
  const router = useRouter();
  const { data: user } = useMe();

  // Already logged in → go straight to the dashboard
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  // Show an error if Google login failed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) toast.error("Google login failed. Please try again.");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-line p-8">
        <h1 className="mb-6 text-center text-2xl font-semibold">Login</h1>

        <a href={GOOGLE_LOGIN_URL} className={buttonClasses("soft", "w-full py-3")}>
          <GoogleIcon />
          Login with Google
        </a>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or sign up through email
          <span className="h-px flex-1 bg-line" />
        </div>

        {/* Email login isn't part of the assignment. Kept to match the design, disabled. */}
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <input className={inputClasses} placeholder="Email ID" disabled />
          <input className={inputClasses} placeholder="Password" type="password" disabled />
          <Button type="submit" className="mt-3 w-full py-3" disabled title="Please use Google login">
            Login
          </Button>
        </form>
      </div>
    </main>
  );
}