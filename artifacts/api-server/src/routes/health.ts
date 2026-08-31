import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { validateDatabaseConnection } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    await validateDatabaseConnection();
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch {
    const data = HealthCheckResponse.parse({ status: "unavailable" });
    res.status(503).json(data);
  }
});

export default router;
