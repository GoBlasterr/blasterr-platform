import { getAuth } from "@clerk/express";
import { CreateAppealBody, CreateAppealResponse } from "@workspace/api-zod";
import { adminAppealsTable, adminNotificationsTable, db } from "@workspace/db";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/appeals", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const body = CreateAppealBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid appeal is required." });
    return;
  }
  const row = await db.transaction(async (tx) => {
    const [created] = await tx.insert(adminAppealsTable).values({
      appellantId: userId,
      targetType: body.data.targetType,
      targetId: body.data.targetId.trim(),
      reason: body.data.reason.trim(),
      details: body.data.details?.trim() ?? "",
    }).returning();
    await tx.insert(adminNotificationsTable).values({
      category: "moderation",
      title: "New moderation appeal",
      message: `A ${created.targetType} moderation decision has been appealed.`,
      entityType: "appeal",
      entityId: created.id,
    });
    return created;
  });
  res.status(201).json(CreateAppealResponse.parse({
    ...row,
    reviewerClerkId: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
});

export default router;