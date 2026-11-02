import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { env } from "../config/env";
import { currentUser, requireUser } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { asyncHandler } from "../utils/asyncHandler";
import {
  buildSlackAuthUrl,
  exchangeSlackCode,
  isSlackConfigured,
  postSlackMessage,
  verifySlackState,
} from "../services/slack.service";

const router = Router();

// 1. "Connect Slack" button → redirect to Slack's approval screen
router.get("/connect", requireUser, (req, res) => {
  if (!isSlackConfigured()) throw new AppError(503, "Slack is not configured on this server");
  res.redirect(buildSlackAuthUrl(currentUser(req).id));
});

// 2. Slack sends the user back here (public: the user is identified by the signed state)
router.get("/callback", asyncHandler(async (req, res) => {
  const fail = (reason: string) =>
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=${encodeURIComponent(reason)}`);

  if (typeof req.query.error === "string") return fail(req.query.error); // e.g. user clicked Cancel

  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const userId = state ? verifySlackState(state) : null;
  if (!code || !userId) return fail("invalid_state");

  try {
    const { webhookUrl, channel } = await exchangeSlackCode(code);
    await db.update(users)
      .set({ slackWebhookUrl: webhookUrl, slackChannel: channel })
      .where(eq(users.id, userId));
  } catch (err) {
    console.error(err);
    return fail("exchange_failed");
  }

  res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
}));

// 3. "Send test alert": handy for the demo video
router.post("/test", requireUser, asyncHandler(async (req, res) => {
  const user = currentUser(req);
  if (!user.slackWebhookUrl) throw new AppError(400, "Slack is not connected");

  try {
    await postSlackMessage(user.slackWebhookUrl, {
      text: `✅ ReachInbox Scheduler is connected. Rate-limit alerts for ${user.email} will appear here.`,
    });
  } catch (err) {
    console.error(err);
    throw new AppError(502, "Slack rejected the message. Try reconnecting Slack.");
  }
  res.status(204).end();
}));

// 4. Disconnect
router.post("/disconnect", requireUser, asyncHandler(async (req, res) => {
  const user = currentUser(req);
  await db.update(users).set({ slackWebhookUrl: null, slackChannel: null }).where(eq(users.id, user.id));
  res.status(204).end();
}));

export default router;