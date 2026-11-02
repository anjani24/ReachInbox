import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";
import { db } from "../db";
import { users, type User } from "../db/schema";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

export const SESSION_COOKIE = "session";
export const OAUTH_STATE_COOKIE = "oauth_state";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL,
);

const isProd = env.NODE_ENV === "production";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,           // JS in the browser can't read it
  sameSite: "lax",          // blocks most cross-site request forgery
  secure: isProd,           // HTTPS-only in production
  maxAge: SESSION_TTL_SECONDS * 1000,
  path: "/",
};

export const stateCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  maxAge: 10 * 60 * 1000, // 10 minutes to finish logging in
  path: "/",
};

export function buildGoogleAuthUrl(state: string) {
  return googleClient.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** Exchanges the one-time code for a verified Google profile */
export async function getGoogleProfile(code: string): Promise<GoogleProfile> {
  const { tokens } = await googleClient.getToken(code);
  if (!tokens.id_token) throw new AppError(401, "Google did not return an ID token");

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new AppError(401, "Incomplete Google profile");

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    avatarUrl: payload.picture ?? null,
  };
}

/** Creates the user on first login, refreshes name/avatar on later logins */
export async function upsertUser(profile: GoogleProfile): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(profile)
    .onConflictDoUpdate({
      target: users.googleId,
      set: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
    })
    .returning();
  return user;
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

/** Returns the user id if the token is valid, otherwise null */
export function verifySession(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}