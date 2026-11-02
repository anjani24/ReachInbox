import { Clock, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatEmailTime } from "@/lib/format";
import type { EmailItem } from "@/types/api";

function Pill({ className, title, children }: { className: string; title?: string; children: ReactNode }) {
  return (
    <span
      title={title}
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", className)}
    >
      {children}
    </span>
  );
}

export function StatusPill({ email }: { email: EmailItem }) {
  switch (email.status) {
    case "scheduled":
      return (
        <Pill className="bg-pending-soft text-pending">
          <Clock className="size-3" />
          {formatEmailTime(email.scheduledAt)}
        </Pill>
      );
    case "sending":
      return (
        <Pill className="bg-brand-soft text-brand">
          <Loader2 className="size-3 animate-spin" />
          Sending
        </Pill>
      );
    case "sent":
      return <Pill className="bg-surface text-ink/70">Sent</Pill>;
    case "failed":
      return <Pill className="bg-red-50 text-red-600" title={email.error ?? undefined}>Failed</Pill>;
  }
}