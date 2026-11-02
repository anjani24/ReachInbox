import { redis } from "../config/redis";

interface RateLimitHit {
  userId: string;
  senderEmail: string;
  senderId: string;
  limit: number;
  windowStart: number;
}

/** Notifies once per sender per hour window, not once per email. */
export async function notifyRateLimitHit(hit: RateLimitHit) {
  const key = `notified:ratelimit:${hit.senderId}:${hit.windowStart}`;
  const isFirst = await redis.set(key, "1", "EX", 2 * 60 * 60, "NX");
  if (!isFirst) return;

  console.warn(
    `Sender ${hit.senderEmail} hit its hourly limit (${hit.limit}). Remaining emails moved to the next hour.`,
  );
  // Slack message will be sent from here in the Slack step
}