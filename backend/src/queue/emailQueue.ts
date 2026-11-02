import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const EMAIL_QUEUE_NAME = "email-send";

// The job only carries the email's id. Everything else is read from Postgres.
export interface SendEmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<SendEmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,                                     // retry failed sends
    backoff: { type: "exponential", delay: 5_000 },  // 5s, 10s, 20s
    removeOnComplete: { age: 7 * 24 * 3600, count: 10_000 },
    removeOnFail: { age: 14 * 24 * 3600 },
  },
});