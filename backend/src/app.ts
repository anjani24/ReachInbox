import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import healthRoutes from "./routes/health.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { bullBoardRouter } from "./queue/bullBoard";
import { requireUser } from "./middleware/auth";
import sendersRoutes from "./routes/senders.routes";
import campaignsRoutes from "./routes/campaign.routes";
import emailsRoutes from "./routes/emails.routes";
import authRoutes from "./routes/auth.routes";
import slackRoutes from "./routes/slack.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRoutes);
  app.use("/admin/queues", bullBoardRouter);
  app.use("/api/slack", slackRoutes);
  app.use("/api/senders", requireUser, sendersRoutes);
  app.use("/api/campaigns", requireUser, campaignsRoutes);
  app.use("/api/emails", requireUser, emailsRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/admin/queues", requireUser, bullBoardRouter); // now login-protected
  app.use("/api/senders", requireUser, sendersRoutes);
  app.use("/api/campaigns", requireUser, campaignsRoutes);
  app.use("/api/emails", requireUser, emailsRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}