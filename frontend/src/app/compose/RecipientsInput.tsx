"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent, type ChangeEvent } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { extractEmails, mergeEmails } from "@/lib/email";

const VISIBLE_CHIPS = 3;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface RecipientsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
}

export function RecipientsInput({ value, onChange }: RecipientsInputProps) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Adds emails and returns how many were actually new */
  const addEmails = (incoming: string[]) => {
    const merged = mergeEmails(value, incoming);
    onChange(merged);
    return merged.length - value.length;
  };

  const commitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    const found = extractEmails(text);
    if (found.length === 0) {
      toast.error(`"${text}" is not a valid email address`);
      return;
    }
    addEmails(found);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " "].includes(e.key)) {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const found = extractEmails(e.clipboardData.getData("text"));
    if (found.length > 1) {
      e.preventDefault();
      const added = addEmails(found);
      toast.success(`Added ${added} email addresses`);
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allows re-uploading the same file
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is too large (max 2 MB)");
      return;
    }

    const found = extractEmails(await file.text());
    if (found.length === 0) {
      toast.error("No email addresses found in this file");
      return;
    }
    const added = addEmails(found);
    toast.success(`Found ${found.length} email addresses in ${file.name}`, {
      description: added < found.length ? `${found.length - added} were already added` : undefined,
    });
  };

  const remove = (email: string) => onChange(value.filter((e) => e !== email));

  const visible = expanded ? value : value.slice(0, VISIBLE_CHIPS);
  const hiddenCount = value.length - visible.length;

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {visible.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand-soft px-2.5 py-0.5 text-xs text-ink"
          >
            {email}
            <button type="button" onClick={() => remove(email)} aria-label={`Remove ${email}`} className="text-muted hover:text-ink">
              <X className="size-3" />
            </button>
          </span>
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-brand bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand"
          >
            +{hiddenCount}
          </button>
        )}
        {expanded && value.length > VISIBLE_CHIPS && (
          <button type="button" onClick={() => setExpanded(false)} className="text-xs text-muted hover:text-ink">
            Show less
          </button>
        )}

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={commitDraft}
          placeholder={value.length ? "" : "recipient@example.com"}
          className="min-w-[160px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {value.length > 0 && (
          <span className="text-xs text-muted">
            {value.length} recipient{value.length === 1 ? "" : "s"}
          </span>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <Upload className="size-4" />
          Upload List
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={handleFile} />
      </div>
    </>
  );
}