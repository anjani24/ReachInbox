import IORedis from "ioredis";
import { env } from "./env";

export function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    // Required by BullMQ: wait for Redis to come back instead of failing commands
    maxRetriesPerRequest: null,
  });
}

// Shared connection for the API process (queue producer + rate-limit counters later)
export const redis = createRedisConnection();