import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../db";
import { users, senders } from "../db/schema";
import { DEV_GOOGLE_ID } from "../middleware/auth";

const SENDER_NAMES = ["Sales Team", "Support Team"];

async function main() {
  let user = await db.query.users.findFirst({ where: eq(users.googleId, DEV_GOOGLE_ID) });
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ googleId: DEV_GOOGLE_ID, email: "dev@example.com", name: "Dev User" })
      .returning();
    console.log("👤 Created dev user");
  }

  const existing = await db.query.senders.findMany({ where: eq(senders.userId, user.id) });

  for (const name of SENDER_NAMES.slice(existing.length)) {
    const account = await nodemailer.createTestAccount();
    await db.insert(senders).values({
      userId: user.id,
      name,
      email: account.user,
      smtpHost: account.smtp.host,
      smtpPort: account.smtp.port,
      smtpUser: account.user,
      smtpPass: account.pass,
    });
    console.log(`📮 Created Ethereal sender "${name}" (${account.user})`);
  }

  const all = await db.query.senders.findMany({ where: eq(senders.userId, user.id) });
  console.table(all.map((s) => ({ id: s.id, name: s.name, email: s.email, password: s.smtpPass })));
  console.log("Log in at https://ethereal.email/login with any email/password above to see sent mail.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);