export const HOUR_MS = 60 * 60 * 1000;

/** Start of the clock hour (UTC) that `ms` falls in */
export function hourWindowStart(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS;
}