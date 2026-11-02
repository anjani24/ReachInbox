import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import healthRoutes from "./routes/health.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { bullBoardRouter } from "./queue/bullBoard";
import devRoutes from "./routes/dev.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRoutes);
  app.use("/admin/queues", bullBoardRouter);

  if (env.NODE_ENV !== "production") {
    app.use("/api/dev", devRoutes);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}