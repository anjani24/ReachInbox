import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { redis } from "../config/redis";
import { HOUR_MS } from "../utils/time";
import { postSlackMessage } from "./slack.service";

interface RateLimitHit {
  userId: string;
  senderEmail: string;
  senderId: string;
  limit: number;
  windowStart: number;
}

/** Alerts once per sender per hour window. Never throws: a Slack problem must not affect sending. */
export async function notifyRateLimitHit(hit: RateLimitHit) {
  const key = `notified:ratelimit:${hit.senderId}:${hit.windowStart}`;
  const isFirst = await redis.set(key, "1", "EX", 2 * 60 * 60, "NX");
  if (!isFirst) return;

  console.warn(`⚠️  Sender ${hit.senderEmail} hit its hourly limit (${hit.limit}). Remaining emails moved to the next hour.`);

  // Read the webhook fresh from the DB each time, so connecting Slack later works with no restart
  const user = await db.query.users.findFirst({
    where: eq(users.id, hit.userId),
    columns: { slackWebhookUrl: true },
  });
  if (!user?.slackWebhookUrl) return; // Slack not connected → nothing else to do

  const resumeAt = hit.windowStart + HOUR_MS;
  const resumeUnix = Math.floor(resumeAt / 1000);
  const text = `⚠️ Hourly sending limit reached for ${hit.senderEmail} (${hit.limit}/hour). Remaining emails resume at ${new Date(resumeAt).toISOString()}.`;

  try {
    await postSlackMessage(user.slackWebhookUrl, {
      text, // fallback for notifications
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `:warning: *Hourly sending limit reached*\n` +
              `Sender *${hit.senderEmail}* hit its limit of *${hit.limit} emails/hour*.\n` +
              // Slack shows this date in each reader's own timezone
              `Remaining emails were moved to the next window and will resume at ` +
              `<!date^${resumeUnix}^{date_short_pretty} {time}|${new Date(resumeAt).toISOString()}>. ` +
              `Nothing was dropped.`,
          },
        },
      ],
    });
  } catch (err) {
    console.error("Slack notification failed (sending continues normally):", err);
  }
}