import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { db, targetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as social from "../lib/social-repository";
import {
  createBusinessProCheckout,
  createBusinessProPortal,
  getBusinessProSummary,
  handleBusinessProWebhook,
  syncBusinessProCheckoutSession,
} from "../lib/business-pro";

const router: IRouter = Router();
const targetParams = z.object({ targetId: z.string().min(1) });

async function viewer(req: Parameters<typeof getAuth>[0]) {
  const { userId } = getAuth(req);
  return userId ? social.userByAuth(userId) : undefined;
}

function requestOrigin(req: Parameters<typeof getAuth>[0]) {
  const forwarded = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? req.protocol;
  return `${protocol}://${req.get("host")}`;
}

router.get("/business/:targetId/pro", async (req, res): Promise<void> => {
  const params = targetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid Business Target." }); return; }
  const current = await viewer(req);
  res.json(await getBusinessProSummary(params.data.targetId, current?.id));
});

router.post("/business/:targetId/pro/checkout", async (req, res): Promise<void> => {
  const params = targetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid Business Target." }); return; }
  const current = await viewer(req);
  if (!current) { res.status(401).json({ error: "Sign in is required to start Business Pro." }); return; }
  const target = await db.select({ slug: targetsTable.slug })
    .from(targetsTable)
    .where(eq(targetsTable.id, params.data.targetId)).limit(1);
  if (!target[0]) { res.status(404).json({ error: "Business Target not found." }); return; }
  const origin = requestOrigin(req);
  const result = await createBusinessProCheckout({
    targetId: params.data.targetId,
    userId: current.id,
    email: current.email,
    name: current.displayName,
    successUrl: `${origin}/business/${target[0].slug}/center?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/business/${target[0].slug}?checkout=canceled`,
  });
  if ("error" in result) {
    const status = result.error === "already_active" ? 409 : result.error === "unverified" ? 403 : result.error === "forbidden" ? 403 : 404;
    res.status(status).json({ error: result.error === "already_active" ? "Business Pro is already active." : result.error === "unverified" ? "Business verification must be complete before upgrading." : "Only the verified business owner can upgrade this Business Target." });
    return;
  }
  res.json({ url: result.url, sessionId: result.sessionId });
});

router.post("/business/:targetId/pro/sync-checkout", async (req, res): Promise<void> => {
  const params = targetParams.safeParse(req.params);
  const sessionId = z.string().min(1).safeParse(req.body?.sessionId);
  if (!params.success || !sessionId.success) { res.status(400).json({ error: "A checkout session is required." }); return; }
  const current = await viewer(req);
  if (!current) { res.status(401).json({ error: "Sign in is required." }); return; }
  const result = await syncBusinessProCheckoutSession(sessionId.data);
  if (!result) { res.status(400).json({ error: "Checkout session is not a Business Pro subscription." }); return; }
  const summary = await getBusinessProSummary(params.data.targetId, current.id);
  if (!summary.hasAccess && summary.status !== "trialing" && summary.status !== "active") {
    res.status(409).json({ error: "Business Pro payment is still being confirmed." });
    return;
  }
  res.json(summary);
});

router.post("/business/:targetId/pro/portal", async (req, res): Promise<void> => {
  const params = targetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid Business Target." }); return; }
  const current = await viewer(req);
  if (!current) { res.status(401).json({ error: "Sign in is required." }); return; }
  const result = await createBusinessProPortal(params.data.targetId, current.id, `${requestOrigin(req)}/business/${params.data.targetId}/center`);
  if ("error" in result) { res.status(result.error === "forbidden" ? 403 : 404).json({ error: "Business Pro subscription not found." }); return; }
  res.json(result);
});

router.post("/stripe/webhook", async (req, res): Promise<void> => {
  const signatureHeader = req.headers["stripe-signature"];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!Buffer.isBuffer(req.body) || !signature) { res.status(400).json({ error: "Invalid Stripe webhook." }); return; }
  try {
    const processed = await handleBusinessProWebhook(req.body, signature);
    res.json({ received: true, processed });
  } catch (error) {
    req.log.warn({ err: error }, "Rejected Business Pro Stripe webhook");
    res.status(400).json({ error: "Invalid Stripe webhook." });
  }
});

export default router;