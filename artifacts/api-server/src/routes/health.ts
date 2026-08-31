import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { validateDatabaseConnection } from "@workspace/db";
import { checkR2Connection } from "../lib/r2";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    const [, storage] = await Promise.all([
      validateDatabaseConnection(),
      checkR2Connection(),
    ]);
    if (storage.status !== "operational") throw new Error("Cloudflare R2 is unavailable.");
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch {
    const data = HealthCheckResponse.parse({ status: "unavailable" });
    res.status(503).json(data);
  }
});

export default router;
