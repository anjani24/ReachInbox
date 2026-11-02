"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, error, refetch } = useMe();
  const isUnauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (isUnauthorized) router.replace("/login");
  }, [isUnauthorized, router]);

  if (isLoading || isUnauthorized) return <FullPageSpinner />;

  // Backend down or unreachable
  if (error || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted">Can&apos;t reach the server right now.</p>
        <Button variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return <>{children}</>;
}