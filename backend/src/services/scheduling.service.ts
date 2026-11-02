import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { campaigns, emails, senders, type User } from "../db/schema";
import { emailQueue } from "../queue/emailQueue";
import { AppError } from "../middleware/errorHandler";
import { chunk } from "../utils/chunk";
import { HOUR_MS, hourWindowStart } from "../utils/time";

export const createCampaignSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().min(1).max(100_000),
  recipients: z.array(z.string().trim().toLowerCase().email()).min(1).max(5000),
  startAt: z.coerce.date(),
  delayMs: z.number().int().min(0).max(HOUR_MS),
  hourlyLimit: z.number().int().min(1).max(10_000),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

/**
 * Gives each email a send time:
 * - email i goes at start + i × delay
 * - at most `hourlyLimit` per clock hour; overflow moves to the next hour
 * Order is always preserved.
 */
export function computeSendSlots(
  count: number,
  startAt: Date,
  delayMs: number,
  hourlyLimit: number,
): Date[] {
  const slots: Date[] = [];
  let cursor = startAt.getTime();
  let windowStart = hourWindowStart(cursor);
  let usedInWindow = 0;

  for (let i = 0; i < count; i++) {
    const currentWindow = hourWindowStart(cursor);
    if (currentWindow !== windowStart) {
      windowStart = currentWindow;
      usedInWindow = 0;
    }
    if (usedInWindow >= hourlyLimit) {
      windowStart += HOUR_MS;
      cursor = windowStart;
      usedInWindow = 0;
    }
    slots.push(new Date(cursor));
    usedInWindow++;
    cursor += delayMs;
  }
  return slots;
}

/** Adds one delayed BullMQ job per email. jobId = email id, so duplicates are ignored. */
export async function enqueueEmails(rows: { id: string; scheduledAt: Date }[]) {
  const now = Date.now();
  for (const batch of chunk(rows, 500)) {
    await emailQueue.addBulk(
      batch.map((row) => ({
        name: "send-email",
        data: { emailId: row.id },
        opts: { jobId: row.id, delay: Math.max(0, row.scheduledAt.getTime() - now) },
      })),
    );
  }
}

export async function createCampaign(user: User, input: CreateCampaignInput) {
  const sender = await db.query.senders.findFirst({
    where: and(eq(senders.id, input.senderId), eq(senders.userId, user.id)),
  });
  if (!sender) throw new AppError(404, "Sender not found");

  const recipients = [...new Set(input.recipients)];
  const startAt = input.startAt.getTime() < Date.now() ? new Date() : input.startAt;
  const slots = computeSendSlots(recipients.length, startAt, input.delayMs, input.hourlyLimit);

  // 1. Save everything in Postgres first (source of truth)
  const { campaign, inserted } = await db.transaction(async (tx) => {
    const [campaign] = await tx
      .insert(campaigns)
      .values({
        userId: user.id,
        senderId: sender.id,
        subject: input.subject,
        body: input.body,
        startAt,
        delayMs: input.delayMs,
        hourlyLimit: input.hourlyLimit,
        totalEmails: recipients.length,
      })
      .returning();

    const rows = recipients.map((to, i) => ({
      campaignId: campaign.id,
      userId: user.id,
      senderId: sender.id,
      toEmail: to,
      subject: input.subject,
      scheduledAt: slots[i],
    }));

    const inserted: { id: string; scheduledAt: Date }[] = [];
    for (const batch of chunk(rows, 500)) {
      const result = await tx
        .insert(emails)
        .values(batch)
        .returning({ id: emails.id, scheduledAt: emails.scheduledAt });
      inserted.push(...result);
    }
    return { campaign, inserted };
  });

  // 2. Then queue the jobs. If this step fails, startup recovery re-queues them.
  await enqueueEmails(inserted);

  return {
    campaignId: campaign.id,
    scheduled: inserted.length,
    duplicatesRemoved: input.recipients.length - recipients.length,
    firstSendAt: slots[0],
    lastSendAt: slots[slots.length - 1],
  };
}