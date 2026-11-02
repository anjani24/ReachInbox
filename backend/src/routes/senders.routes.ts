import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { senders } from "../db/schema";
import { currentUser } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const rows = await db
    .select({ id: senders.id, name: senders.name, email: senders.email })
    .from(senders)
    .where(eq(senders.userId, user.id));
  res.json({ senders: rows });
}));

export default router;