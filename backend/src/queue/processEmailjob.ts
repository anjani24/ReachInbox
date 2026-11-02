import { DelayedError, type Job } from "bullmq";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { campaigns, emails, senders } from "../db/schema";
import { env } from "../config/env";
import type { SendEmailJobData } from "./emailQueue";
import { sendMail } from "../services/mailer.service";
import { releaseHourlySlot, tryReserveHourlySlot } from "../services/rateLimiter.service";
import { notifyRateLimitHit } from "../services/notification.service";

export async function processEmailJob(job: Job<SendEmailJobData>, token?: string) {
  const { emailId } = job.data;

  // 1. CLAIM: only one worker can flip scheduled → sending. This is what prevents double sends.
  const [email] = await db
    .update(emails)
    .set({ status: "sending" })
    .where(and(eq(emails.id, emailId), eq(emails.status, "scheduled")))
    .returning();

  if (!email) return { skipped: true, reason: "already sent or in progress" };

  const [sender, campaign] = await Promise.all([
    db.query.senders.findFirst({ where: eq(senders.id, email.senderId) }),
    db.query.campaigns.findFirst({ where: eq(campaigns.id, email.campaignId) }),
  ]);

  if (!sender || !campaign) {
    await db.update(emails).set({ status: "failed", error: "Sender or campaign missing" })
      .where(eq(emails.id, email.id));
    return { skipped: true, reason: "missing sender/campaign" };
  }

  // 2. HOURLY LIMIT: over the cap → move to the next hour. Never drop, never fail.
  const slot = await tryReserveHourlySlot(sender.id, env.MAX_EMAILS_PER_HOUR_PER_SENDER);

  if (!slot.allowed) {
    await db.update(emails)
      .set({ status: "scheduled", scheduledAt: new Date(slot.nextWindowStart) })
      .where(eq(emails.id, email.id));

    await notifyRateLimitHit({
      userId: email.userId,
      senderId: sender.id,
      senderEmail: sender.email,
      limit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
      windowStart: slot.windowStart,
    });

    await job.moveToDelayed(slot.nextWindowStart, token);
    throw new DelayedError(); // tells BullMQ "rescheduled", not "failed"
  }

  // 3. SEND
  try {
    const result = await sendMail({
      sender,
      to: email.toEmail,
      subject: email.subject,
      html: campaign.body,
      emailId: email.id,
    });

    await db.update(emails)
      .set({
        status: "sent",
        sentAt: new Date(),
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        error: null,
        attempts: sql`${emails.attempts} + 1`,
      })
      .where(eq(emails.id, email.id));

    return result;
  } catch (err) {
    await releaseHourlySlot(sender.id, slot.windowStart);

    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await db.update(emails)
      .set({
        status: isLastAttempt ? "failed" : "scheduled", // "scheduled" lets the retry claim it again
        error: err instanceof Error ? err.message : String(err),
        attempts: sql`${emails.attempts} + 1`,
      })
      .where(eq(emails.id, email.id));

    throw err; // BullMQ retries with backoff (5s, 10s, 20s)
  }
}