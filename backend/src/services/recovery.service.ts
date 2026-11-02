import { and, eq, lt } from "drizzle-orm";
import { db } from "../db";
import { emails } from "../db/schema";
import { env } from "../config/env";
import { emailQueue } from "../queue/emailQueue";
import { enqueueEmails } from "./scheduling.service";

/**
 * Runs when the worker starts. Postgres is the source of truth:
 * 1. Emails stuck in "sending" (worker crashed mid-send) go back to "scheduled"
 * 2. Every "scheduled" email must have a live job in Redis; re-add any that are missing
 */
export async function recoverOnStartup() {
  const stuckBefore = new Date(Date.now() - env.STUCK_SENDING_TIMEOUT_MS);

  const reset = await db.update(emails)
    .set({ status: "scheduled" })
    .where(and(eq(emails.status, "sending"), lt(emails.updatedAt, stuckBefore)))
    .returning({ id: emails.id });

  const pending = await db
    .select({ id: emails.id, scheduledAt: emails.scheduledAt })
    .from(emails)
    .where(eq(emails.status, "scheduled"));

  const missing: { id: string; scheduledAt: Date }[] = [];
  for (const row of pending) {
    const job = await emailQueue.getJob(row.id);
    if (!job) {
      missing.push(row);
      continue;
    }
    const state = await job.getState();
    if (state === "completed" || state === "failed") {
      await job.remove();
      missing.push(row);
    }
  }

  if (missing.length) await enqueueEmails(missing);

  console.log(
    `Recovery: ${reset.length} stuck reset, ${pending.length} pending checked, ${missing.length} re-queued`,
  );
}