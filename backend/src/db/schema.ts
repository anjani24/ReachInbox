import {
  pgTable, pgEnum, uuid, text, integer, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";

// Allowed values for an email's status
export const emailStatusEnum = pgEnum("email_status", [
  "scheduled", // waiting in the queue
  "sending",   // a worker has claimed it (prevents double-sending)
  "sent",
  "failed",
]);

// Reusable timestamp columns
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
};

// People who log in with Google
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  slackWebhookUrl: text("slack_webhook_url"), // set after "Connect Slack"
  slackChannel: text("slack_channel"),
  ...timestamps,
});

// Ethereal SMTP accounts that emails are sent from
export const senders = pgTable("senders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpUser: text("smtp_user").notNull(),
  smtpPass: text("smtp_pass").notNull(),
  ...timestamps,
});

// One "Compose → Schedule" action
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => senders.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),               // HTML from the rich-text editor
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  delayMs: integer("delay_ms").notNull(),     // gap between two emails
  hourlyLimit: integer("hourly_limit").notNull(),
  totalEmails: integer("total_emails").notNull(),
  ...timestamps,
});

// One row per recipient: this is what the worker sends
export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => senders.id),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    status: emailStatusEnum("status").default("scheduled").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    messageId: text("message_id"),   // SMTP message id
    previewUrl: text("preview_url"), // Ethereal link to view the email
    error: text("error"),
    ...timestamps,
  },
  (t) => [
    // Dashboard tabs: "my scheduled emails, by time"
    index("emails_user_status_time_idx").on(t.userId, t.status, t.scheduledAt),
    // Restart recovery: "find stuck 'sending' rows"
    index("emails_status_updated_idx").on(t.status, t.updatedAt),
    // The same address can't appear twice in one campaign
    uniqueIndex("emails_campaign_to_unique").on(t.campaignId, t.toEmail),
  ],
);

// Handy TypeScript types generated from the tables
export type User = typeof users.$inferSelect;
export type Sender = typeof senders.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;