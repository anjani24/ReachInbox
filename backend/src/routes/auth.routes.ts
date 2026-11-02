import { Router } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { currentUser, requireUser } from "../middleware/auth";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  buildGoogleAuthUrl,
  getGoogleProfile,
  sessionCookieOptions,
  signSession,
  stateCookieOptions,
  upsertUser,
} from "../services/auth.service";
import { ensureDefaultSenders } from "../services/senders.service";
import {isSlackConfigured} from "../services/slack.service";
const router = Router();

// 1. Start login: redirect to Google
router.get("/google", (_req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, stateCookieOptions);
  res.redirect(buildGoogleAuthUrl(state));
});

// 2. Google sends the user back here
router.get("/google/callback", asyncHandler(async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const expectedState: string | undefined = req.cookies?.[OAUTH_STATE_COOKIE];

  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || state !== expectedState) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }

  const profile = await getGoogleProfile(code);
  const user = await upsertUser(profile);
  await ensureDefaultSenders(user.id);

  res.cookie(SESSION_COOKIE, signSession(user.id), sessionCookieOptions);
  res.redirect(`${env.FRONTEND_URL}/dashboard`);
}));

// 3. Who am I? (the frontend header uses this)
router.get("/me", requireUser, (req, res) => {
  const user = currentUser(req);
    res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      slackConnected: Boolean(user.slackWebhookUrl),
      slackChannel: user.slackChannel,
      slackAvailable: isSlackConfigured(),
    },
  });
});

// 4. Logout
router.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});

export default router;