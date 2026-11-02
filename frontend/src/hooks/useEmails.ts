"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EmailCounts, EmailItem, EmailTab, Paginated } from "@/types/api";

export const EMAIL_PAGE_SIZE = 20;

export function useEmailCounts() {
  return useQuery({
    queryKey: ["email-counts"],
    queryFn: () => api<EmailCounts>("/api/emails/counts"),
    refetchInterval: 10_000,
  });
}

export function useEmailList(tab: EmailTab, page: number, q: string) {
  return useQuery({
    queryKey: ["emails", tab, page, q],
    queryFn: () => {
      const params = new URLSearchParams({ status: tab, page: String(page), pageSize: String(EMAIL_PAGE_SIZE) });
      if (q) params.set("q", q);
      return api<Paginated<EmailItem>>(`/api/emails?${params}`);
    },
    placeholderData: keepPreviousData, // keep showing old rows while the next page loads
    refetchInterval: 10_000,           // rows move from Scheduled → Sent automatically
  });
}