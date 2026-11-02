"use client";

import { useCallback, useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useClickOutside } from "@/hooks/useClickOutside";
import { toLocalInputValue, tomorrowAt } from "@/lib/dates";

const PRESET_HOURS = [10, 11, 15];

interface SendLaterPopoverProps {
  onConfirm: (startAt: Date) => void;
  loading: boolean;
}

export function SendLaterPopover({ onConfirm, loading }: SendLaterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(close);

  const openPopover = () => {
    // Default: 2 minutes from now
    setValue(toLocalInputValue(new Date(Date.now() + 2 * 60_000)));
    setOpen(true);
  };

  const handleDone = () => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      toast.error("Please pick a date and time");
      return;
    }
    onConfirm(date);
  };

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => (open ? close() : openPopover())}
        className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"
        aria-label="Schedule"
      >
        <Clock className="size-5" />
      </button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full px-5"
        onClick={() => (open ? close() : openPopover())}
        loading={loading}
      >
        Send Later
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-line bg-white p-4 shadow-xl">
          <p className="mb-3 text-sm font-medium">Send Later</p>

          <input
            type="datetime-local"
            value={value}
            min={toLocalInputValue(new Date())}
            onChange={(e) => setValue(e.target.value)}
            className="mb-3 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            aria-label="Pick date & time"
          />

          <div className="mb-4 flex flex-col">
            {PRESET_HOURS.map((hour) => {
              const date = tomorrowAt(hour);
              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() => setValue(toLocalInputValue(date))}
                  className="rounded-md px-2 py-2 text-left text-sm hover:bg-surface"
                >
                  Tomorrow, {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="button" variant="outline" className="rounded-full px-5" onClick={handleDone} loading={loading}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}