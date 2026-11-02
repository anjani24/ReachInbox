import { redis } from "../config/redis";
import { HOUR_MS, hourWindowStart } from "../utils/time";

// Atomic "take a slot if one is free". Runs inside Redis, so two workers can never both take the last slot.
const RESERVE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
`;

function counterKey(senderId: string, windowStart: number) {
  return `ratelimit:sender:${senderId}:${windowStart}`;
}

export async function tryReserveHourlySlot(senderId: string, limit: number) {
  const windowStart = hourWindowStart(Date.now());
  const allowed = (await redis.eval(
    RESERVE_SCRIPT,
    1,
    counterKey(senderId, windowStart),
    limit,
    2 * 60 * 60, // key expires after 2h
  )) as number;

  return { allowed: allowed === 1, windowStart, nextWindowStart: windowStart + HOUR_MS };
}

/** Give a slot back (used when the send itself failed) */
export async function releaseHourlySlot(senderId: string, windowStart: number) {
  await redis.decr(counterKey(senderId, windowStart));
}