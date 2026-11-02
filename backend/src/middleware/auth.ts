import { Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type User } from "../db/schema";
import { AppError } from "./errorHandler";
import { asyncHandler } from "../utils/asyncHandler";
import { SESSION_COOKIE, verifySession } from "../services/auth.service";

export const requireUser = asyncHandler(async (req, _res, next) => {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
  const userId = token ? verifySession(token) : null;
  if (!userId) throw new AppError(401, "Not authenticated");

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new AppError(401, "User no longer exists");

  req.user = user;
  next();
});

export function currentUser(req: Request): User {
  if (!req.user) throw new AppError(401, "Not authenticated");
  return req.user;
}