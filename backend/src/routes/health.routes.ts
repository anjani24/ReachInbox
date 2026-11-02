import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  let database = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "down";
  }
  res.status(database === "ok" ? 200 : 503).json({
    status: database === "ok" ? "ok" : "degraded",
    database,
    time: new Date().toISOString(),
  });
});

export default router;