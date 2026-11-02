"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCreateCampaign, useSenders } from "@/hooks/UseCompose";
import { formatEmailTime } from "@/lib/format";
import { FormRow } from "./FormRow";
import { RecipientsInput } from "./RecipientsInput";
import { RichTextEditor } from "./RichTextEditor";
import { SendLaterPopover } from "./SendLaterPopover";

const MAX_RECIPIENTS = 5000;
const smallInput =
  "w-16 rounded-md border border-line px-2 py-1 text-center text-sm outline-none focus:border-brand";

export function ComposeForm() {
  const router = useRouter();
  const { data: senders, isLoading: sendersLoading } = useSenders();
  const createCampaign = useCreateCampaign();

  const [senderId, setSenderId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState({ html: "", isEmpty: true });
  const [delaySeconds, setDelaySeconds] = useState("5");
  const [hourlyLimit, setHourlyLimit] = useState("100");

  // Default to the first sender without an extra effect
  const selectedSenderId = senderId || senders?.[0]?.id || "";

  const validate = (): string | null => {
    if (!selectedSenderId) return "Please choose a sender";
    if (recipients.length === 0) return "Add at least one recipient";
    if (recipients.length > MAX_RECIPIENTS) return `Maximum ${MAX_RECIPIENTS} recipients per campaign`;
    if (!subject.trim()) return "Subject is required";
    if (body.isEmpty) return "Email body is empty";
    const delay = Number(delaySeconds || 0);
    if (!Number.isInteger(delay) || delay < 0 || delay > 3600) return "Delay must be 0–3600 seconds";
    const limit = Number(hourlyLimit);
    if (!Number.isInteger(limit) || limit < 1) return "Hourly limit must be at least 1";
    return null;
  };

  const handleSchedule = (startAt: Date) => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    createCampaign.mutate(
      {
        senderId: selectedSenderId,
        subject: subject.trim(),
        body: body.html,
        recipients,
        startAt: startAt.toISOString(),
        delayMs: Number(delaySeconds || 0) * 1000,
        hourlyLimit: Number(hourlyLimit),
      },
      {
        onSuccess: (res) => {
          toast.success(`Scheduled ${res.scheduled} email${res.scheduled === 1 ? "" : "s"}`, {
            description: `${formatEmailTime(res.firstSendAt)} → ${formatEmailTime(res.lastSendAt)}`,
          });
          router.push("/dashboard/scheduled");
        },
      },
    );
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4">
        <Link href="/dashboard" aria-label="Back" className="rounded-lg p-1 hover:bg-surface">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-xl font-medium">Compose New Email</h1>
        <SendLaterPopover onConfirm={handleSchedule} loading={createCampaign.isPending} />
      </header>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 pb-10">
          <FormRow label="From">
            {sendersLoading ? (
              <span className="text-sm text-muted">Loading senders…</span>
            ) : senders?.length ? (
              <select
                value={selectedSenderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="rounded-md bg-surface px-3 py-1.5 text-sm outline-none"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>{s.email}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-red-600">No senders found. Try logging out and in again.</span>
            )}
          </FormRow>

          <FormRow label="To">
            <RecipientsInput value={recipients} onChange={setRecipients} />
          </FormRow>

          <FormRow label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              maxLength={200}
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted"
            />
          </FormRow>

          <div className="flex flex-wrap items-center gap-8 py-4 text-sm">
            <label className="flex items-center gap-3">
              <span>Delay between 2 emails (sec)</span>
              <input
                type="number"
                min={0}
                max={3600}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(e.target.value)}
                placeholder="00"
                className={smallInput}
              />
            </label>
            <label className="flex items-center gap-3">
              <span>Hourly Limit</span>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
                placeholder="00"
                className={smallInput}
              />
            </label>
          </div>

          <RichTextEditor onChange={(html, isEmpty) => setBody({ html, isEmpty })} />
        </div>
      </div>
    </div>
  );
}