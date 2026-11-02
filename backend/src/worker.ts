import { Worker } from "bullmq";
import { env } from "./config/env";
import { createRedisConnection, redis } from "./config/redis";
import { EMAIL_QUEUE_NAME, emailQueue, type SendEmailJobData } from "./queue/emailQueue";
import { processEmailJob } from "./queue/processEmailjob";
import { recoverOnStartup } from "./services/recovery.service";
import { closeDb } from "./db";

async function main() {
  await recoverOnStartup();

  const worker = new Worker<SendEmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection(), // workers need their own connection
    concurrency: env.WORKER_CONCURRENCY,
    limiter: { max: 1, duration: env.MIN_SEND_DELAY_MS }, // min gap between sends, across ALL workers
  });

  worker.on("completed", (job, result) => console.log(`${job.id}`, result));
  worker.on("failed", (job, err) => console.error(`${job?.id}: ${err.message}`));

  console.log(
    `Worker started (concurrency=${env.WORKER_CONCURRENCY}, minDelay=${env.MIN_SEND_DELAY_MS}ms, ` +
      `hourlyCap=${env.MAX_EMAILS_PER_HOUR_PER_SENDER}/sender)`,
  );

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, closing worker...`);
    await worker.close(); // waits for in-progress jobs to finish
    await emailQueue.close();
    await redis.quit();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});