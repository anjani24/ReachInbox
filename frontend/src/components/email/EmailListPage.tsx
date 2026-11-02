"use client";

import { useEmails } from "@/hooks/useEmails";
import type { Email, EmailTab } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const PAGE_COPY: Record<EmailTab, { title: string; description: string; emptyTitle: string; emptyCopy: string }> = {
  scheduled: {
    title: "Scheduled emails",
    description: "Keep track of emails queued up for delivery.",
    emptyTitle: "Nothing scheduled yet",
    emptyCopy: "Emails you schedule for a campaign will show up here.",
  },
  sent: {
    title: "Sent emails",
    description: "Review emails that have been sent or failed to deliver.",
    emptyTitle: "No sent emails yet",
    emptyCopy: "Once your scheduled emails are processed, they’ll appear here.",
  },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function EmailRow({ email, status }: { email: Email; status: EmailTab }) {
  const date = status === "scheduled" ? email.scheduledAt : email.sentAt ?? email.scheduledAt;
  return (
    <article className="email-row">
      <span className="email-primary" title={email.toEmail}>{email.toEmail}</span>
      <span className="email-subject" title={email.subject}>{email.subject}</span>
      <span className={`status-pill status-${email.status}`}>{email.status}</span>
      <time className="email-date" dateTime={date}>{formatDate(date)}</time>
    </article>
  );
}

export function EmailListPage({ status }: { status: EmailTab }) {
  const { data, loading, error } = useEmails(status);
  const copy = PAGE_COPY[status];

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Email workspace</p>
          <h1 className="page-title">{copy.title}</h1>
          <p className="page-description">{copy.description}</p>
        </div>
      </header>

      <section className="email-panel" aria-label={copy.title}>
        <div className="panel-toolbar">
          <span className="panel-title">All emails</span>
          <span className="panel-count">{data ? `${data.total} total` : ""}</span>
        </div>

        {loading ? (
          <div className="state-panel" aria-live="polite">
            <Spinner />
            <p className="state-message">Loading emails…</p>
          </div>
        ) : error ? (
          <div className="state-panel">
            <p className="state-message error-message" role="alert">{error}</p>
          </div>
        ) : !data?.items.length ? (
          <div className="empty-state">
            <div className="empty-state-content">
              <span className="empty-state-icon" aria-hidden="true">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyCopy}</p>
            </div>
          </div>
        ) : (
          data.items.map((email) => <EmailRow key={email.id} email={email} status={status} />)
        )}
      </section>
    </>
  );
}
