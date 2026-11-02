"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, API_URL } from "@/lib/api";

export const SLACK_CONNECT_URL = `${API_URL}/api/slack/connect`;

export function useSlackTest() {
  return useMutation({
    mutationFn: () => api<void>("/api/slack/test", { method: "POST" }),
    onSuccess: () => toast.success("Test message sent to Slack"),
    onError: (err) => toast.error(err.message),
  });
}

export function useSlackDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/api/slack/disconnect", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Slack disconnected");
    },
    onError: (err) => toast.error(err.message),
  });
}