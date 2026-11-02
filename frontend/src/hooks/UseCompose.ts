"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { CreateCampaignInput, CreateCampaignResult, Sender } from "@/types/api";

export function useSenders() {
  return useQuery({
    queryKey: ["senders"],
    queryFn: () => api<{ senders: Sender[] }>("/api/senders").then((r) => r.senders),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      api<CreateCampaignResult>("/api/campaigns", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["email-counts"] });
    },
    onError: (err) => {
      // Show the server's validation message if there is one
      const issues = err instanceof ApiError ? (err.details as { path: string; message: string }[] | undefined) : undefined;
      const detail = issues?.[0] ? `${issues[0].path}: ${issues[0].message}` : undefined;
      toast.error(err.message, { description: detail });
    },
  });
}