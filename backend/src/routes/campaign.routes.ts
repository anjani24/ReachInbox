import { Router } from "express";
import { currentUser } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { createCampaign, createCampaignSchema } from "../services/scheduling.service";

const router = Router();

router.post("/", asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const input = createCampaignSchema.parse(req.body);
  const result = await createCampaign(user, input);
  res.status(201).json(result);
}));

export default router;