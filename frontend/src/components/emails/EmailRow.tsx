import { ExternalLink, Star } from "lucide-react";
import { formatEmailTime } from "@/lib/format";
import type { EmailItem, EmailTab } from "@/types/api";
import { StatusPill } from "./StatusPill";

export function EmailRow({ email, tab }: { email: EmailItem; tab: EmailTab }) {
  return (
    <li className="flex items-center gap-4 border-b border-line px-6 py-3.5 transition-colors hover:bg-surface/60">
      <span className="w-48 shrink-0 truncate text-sm" title={email.toEmail}>
        To: {email.toEmail}
      </span>

      <StatusPill email={email} />

      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold">{email.subject}</span>
        {email.preview && <span className="text-muted"> - {email.preview}</span>}
      </p>

      {tab === "sent" && email.sentAt && (
        <span className="shrink-0 text-xs text-muted">{formatEmailTime(email.sentAt)}</span>
      )}

      {email.previewUrl && (
        <a
          href={email.previewUrl}
          target="_blank"
          rel="noreferrer"
          title="Open in Ethereal"
          className="shrink-0 rounded p-1 text-muted hover:bg-surface hover:text-ink"
        >
          <ExternalLink className="size-4" />
        </a>
      )}

      <Star className="size-4 shrink-0 text-muted/50" />
    </li>
  );
}