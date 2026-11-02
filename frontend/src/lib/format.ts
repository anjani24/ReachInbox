const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

/** "Tue 9:15:12 AM" within the next/last 6 days, otherwise "Nov 12, 9:15 AM" */
export function formatEmailTime(iso: string): string {
  const date = new Date(iso);
  const isNear = Math.abs(date.getTime() - Date.now()) < SIX_DAYS_MS;

  return isNear
    ? date.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", second: "2-digit" })
    : date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}