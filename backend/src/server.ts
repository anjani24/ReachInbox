import { createApp } from "./app";
import { env } from "./config/env";
import { closeDb } from "./db";
import { redis } from "./config/redis";
import { emailQueue } from "./queue/emailQueue";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
  console.log(`Queue dashboard: http://localhost:${env.PORT}/admin/queues`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await emailQueue.close();
    await redis.quit();
    await closeDb();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));