import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { redis } from "../config/redis";

const router = Router();

function checkDependency(check: () => Promise<unknown>): Promise<"ok" | "down"> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve("down"), 2000);
    Promise.resolve()
      .then(check)
      .then(
        () => resolve("ok"),
        () => resolve("down"),
      )
      .finally(() => clearTimeout(timeout));
  });
}

router.get("/", async (_req, res) => {
  const [database, cache] = await Promise.all([
    checkDependency(() => db.execute(sql`select 1`)),
    checkDependency(() => redis.ping()),
  ]);

  const healthy = database === "ok" && cache === "ok";
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database,
    redis: cache,
    time: new Date().toISOString(),
  });
});

export default router;