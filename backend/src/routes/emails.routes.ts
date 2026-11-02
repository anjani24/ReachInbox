import { Router } from "express";
import { z } from "zod";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { emails } from "../db/schema";
import { currentUser } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const listQuerySchema = z.object({
  status: z.enum(["scheduled", "sent"]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const TAB_STATUSES = {
  scheduled: ["scheduled", "sending"] as const,
  sent: ["sent", "failed"] as const,
};

router.get("/", asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const { status, page, pageSize } = listQuerySchema.parse(req.query);

  const where = and(eq(emails.userId, user.id), inArray(emails.status, [...TAB_STATUSES[status]]));
  const orderBy = status === "scheduled" ? asc(emails.scheduledAt) : desc(emails.updatedAt);

  const [items, [{ total }]] = await Promise.all([
    db.select({
        id: emails.id,
        toEmail: emails.toEmail,
        subject: emails.subject,
        status: emails.status,
        scheduledAt: emails.scheduledAt,
        sentAt: emails.sentAt,
        previewUrl: emails.previewUrl,
        error: emails.error,
      })
      .from(emails)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(emails).where(where),
  ]);

  res.json({ items, page, pageSize, total });
}));

router.get("/counts", asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const rows = await db
    .select({ status: emails.status, count: sql<number>`count(*)::int` })
    .from(emails)
    .where(eq(emails.userId, user.id))
    .groupBy(emails.status);

  const by = Object.fromEntries(rows.map((r) => [r.status, r.count]));
  res.json({
    scheduled: (by.scheduled ?? 0) + (by.sending ?? 0),
    sent: (by.sent ?? 0) + (by.failed ?? 0),
  });
}));

export default router;