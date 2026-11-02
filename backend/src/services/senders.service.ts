import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { senders } from "../db/schema";

const DEFAULT_SENDER_NAMES = ["Sales Team", "Support Team"];

/** Gives every user two Ethereal sender accounts. Safe to call on every login. */
export async function ensureDefaultSenders(userId: string) {
  const existing = await db.query.senders.findMany({ where: eq(senders.userId, userId) });

  for (const name of DEFAULT_SENDER_NAMES.slice(existing.length)) {
    try {
      const account = await nodemailer.createTestAccount();
      await db.insert(senders).values({
        userId,
        name,
        email: account.user,
        smtpHost: account.smtp.host,
        smtpPort: account.smtp.port,
        smtpUser: account.user,
        smtpPass: account.pass,
      });
    } catch (err) {
      // Login must still work if Ethereal is temporarily down
      console.error(`Could not create Ethereal sender "${name}":`, err);
    }
  }
}