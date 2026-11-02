"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Clock, SearchX, Send } from "lucide-react";
import { toast } from "sonner";
import { EMAIL_PAGE_SIZE, useEmailList } from "@/hooks/useEmails";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Button, buttonClasses } from "@/components/ui/Button";
import type { EmailTab } from "@/types/api";
import { EmailListToolbar } from "./EmailListToolbar";
import { EmailListSkeleton } from "./EmailListSkeleton";
import { EmailRow } from "./EmailRow";
import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";

const EMPTY_COPY = {
  scheduled: {
    icon: Clock,
    title: "No scheduled emails",
    description: "Emails you schedule will wait here until it's their time to send.",
  },
  sent: {
    icon: Send,
    title: "Nothing sent yet",
    description: "Once your scheduled emails go out, they'll show up here.",
  },
};

export function EmailListView({ tab }: { tab: EmailTab }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);

  const { data, isLoading, isError, isFetching, refetch } = useEmailList(tab, page, q);

  useEffect(() => {
    if (isError) toast.error("Couldn't load emails.", { id: `emails-${tab}-error` });
  }, [isError, tab]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // a new search starts from page 1
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["email-counts"] });
  };

  const renderBody = () => {
    if (isLoading) return <EmailListSkeleton />;

    if (isError && !data) {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Something went wrong"
          description="We couldn't load your emails. Check that the server is running."
          action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
        />
      );
    }

    if (!data || data.items.length === 0) {
      if (q) {
        return (
          <EmptyState icon={SearchX} title="No matches" description={`Nothing found for "${q}".`} />
        );
      }
      const copy = EMPTY_COPY[tab];
      return (
        <EmptyState
          {...copy}
          action={<Link href="/compose" className={buttonClasses("outline", "rounded-full")}>Compose</Link>}
        />
      );
    }

    return (
      <>
        <ul className="flex-1 overflow-y-auto">
          {data.items.map((email) => (
            <EmailRow key={email.id} email={email} tab={tab} />
          ))}
        </ul>
        <Pagination page={data.page} pageSize={EMAIL_PAGE_SIZE} total={data.total} onPageChange={setPage} />
      </>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <EmailListToolbar
        search={search}
        onSearchChange={handleSearchChange}
        onRefresh={handleRefresh}
        refreshing={isFetching && !isLoading}
      />
      <div className="flex min-h-0 flex-1 flex-col border-t border-line">{renderBody()}</div>
    </div>
  );
}
