import { Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type User } from "../db/schema";
import { AppError } from "./errorHandler";
import { asyncHandler } from "../utils/asyncHandler";

export const DEV_GOOGLE_ID = "dev-user";

// TEMPORARY: always logs in as the seeded dev user.
// Replaced by real Google OAuth in the auth step.
export const requireUser = asyncHandler(async (req, _res, next) => {
  const user = await db.query.users.findFirst({ where: eq(users.googleId, DEV_GOOGLE_ID) });
  if (!user) throw new AppError(401, "No dev user found. Run `npm run seed` first.");
  req.user = user;
  next();
});

export function currentUser(req: Request): User {
  if (!req.user) throw new AppError(401, "Not authenticated");
  return req.user;
}