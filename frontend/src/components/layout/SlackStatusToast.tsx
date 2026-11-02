"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Slack connection was cancelled.",
  invalid_state: "Slack connection expired. Please try again.",
  exchange_failed: "Slack didn't accept the connection. Please try again.",
};

export function SlackStatusToast() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("slack");
    if (!status) return;

    if (status === "connected") {
      toast.success("Slack connected! Rate-limit alerts will be posted there.");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } else {
      toast.error(ERROR_MESSAGES[params.get("reason") ?? ""] ?? "Could not connect Slack.");
    }

    router.replace(pathname); // remove ?slack=... from the URL
  }, [pathname, queryClient, router]);

  return null;
}