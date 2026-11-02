import { Router } from "express";
import { randomUUID } from "crypto";
import { emailQueue } from "../queue/emailQueue";

const router = Router();

// Adds a fake job that becomes ready in 2 minutes
router.post("/test-job", async (_req, res) => {
  const fakeEmailId = randomUUID();
  const job = await emailQueue.add(
    "send-email",
    { emailId: fakeEmailId },
    { jobId: fakeEmailId, delay: 2 * 60 * 1000 },
  );
  res.json({ jobId: job.id, runsAt: new Date(Date.now() + 2 * 60 * 1000) });
});

export default router;