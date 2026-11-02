"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EmailCounts } from "@/types/api";

export function useEmailCounts() {
  return useQuery({
    queryKey: ["email-counts"],
    queryFn: () => api<EmailCounts>("/api/emails/counts"),
    refetchInterval: 10_000, // sidebar counts stay live while emails send
  });
}