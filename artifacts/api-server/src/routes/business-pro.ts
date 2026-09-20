import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, targetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as social from "../lib/social-repository";
import {
  createBusinessProCheckout,
  createBusinessProPortal,
  addBusinessProTeamMember,
  listBusinessProTeam,
  removeBusinessProTeamMember,
  updateBusinessProTeamMember,
  BUSINESS_PRO_TEAM_ROLES,
  getBusinessProSummary,
  handleBusinessProWebhook,
  syncBusinessProCheckoutSession,
} from "../lib/business-pro";

const router: IRouter = Router();
const targetIdFrom = (params: Record<string, string | undefined>) => {
  const targetId = params.targetId;
  return targetId && targetId.trim() ? targetId : null;
};

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
  const targetId = targetIdFrom(req.params);
  if (!targetId) { res.status(400).json({ error: "Invalid Business Target." }); return; }
  const current = await viewer(req);
  res.json(await getBusinessProSummary(targetId, current?.id));
});

router.post("/business/:targetId/pro/checkout", async (req, res): Promise<void> => {
  const targetId = targetIdFrom(req.params);
  if (!targetId) { res.status(400).json({ error: "Invalid Business Target." }); return; }
  const current = await viewer(req);
  if (!current) { res.status(401).json({ error: "Sign in is required to start Business Pro." }); return; }
  const target = await db.select({ slug: targetsTable.slug })
    .from(targetsTable)
    .where(eq(targetsTable.id, targetId)).limit(1);
  if (!target[0]) { res.status(404).json({ error: "Business Target not found." }); return; }
  const origin = requestOrigin(req);
  const result = await createBusinessProCheckout({
    targetId,
    userId: current.id,
    email: current.email,
    name: current.displayName,
    successUrl: `${origin}/business/${target[0].slug}/center?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/business/${target[0].slug}?checkout=canceled`,
  });
  if (!("member" in result)) {
    const status = result.error === "already_active" ? 409 : result.error === "unverified" ? 403 : result.error === "forbidden" ? 403 : 404;
    res.status(status).json({ error: result.error === "already_active" ? "Business Pro is already active." : result.error === "unverified" ? "Business verification must be complete before upgrading." : "Only the verified business owner can upgrade this Business Target." });
    return;
  }
  res.json({ url: result.url, sessionId: result.sessionId });
});

router.post("/business/:targetId/pro/sync-checkout", async (req, res): Promise<void> => {
  const targetId = targetIdFrom(req.params);
  const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim() ? req.body.sessionId : null;
  if (!targetId || !sessionId) { res.status(400).json({ error: "A checkout session is required." }); return; }
  const current = await viewer(req);
  if (!current) { res.status(401).json({ error: "Sign in is required." }); return; }
  const result = await syncBusinessProCheckoutSession(sessionId);
  if (!result) { res.status(400).json({ error: "Checkout session is not a Business Pro subscription." }); return; }
  const summary = await getBusinessProSummary(targetId, current.id);
  if (!summary.hasAccess && summary.status !== "trialing" && summary.status !== "active") {
    res.status(409).json({ error: "Business Pro payment is still being confirmed." });
    return;
  }
  res.json(summary);
});

router.post("/business/:targetId/pro/portal", async (req, res): Promise<void> => {
  const targetId = targetIdFrom(req.params);
  if (!targetId) { res.status(400).json({ error: "Invalid Business Target." }); return; }
  const current = await viewer(req);
  if (!current) { res.status(401).json({ error: "Sign in is required." }); return; }
  const result = await createBusinessProPortal(targetId, current.id, `${requestOrigin(req)}/business/${targetId}/center`);
  if ("error" in result) { res.status(result.error === "forbidden" ? 403 : 404).json({ error: "Business Pro subscription not found." }); return; }
  res.json(result);
});

router.get("/business/:targetId/pro/team", async (req, res): Promise<void> => {
  const targetId = targetIdFrom(req.params);
  const current = await viewer(req);
  if (!targetId || !current) { res.status(401).json({ error: "Sign in is required." }); return; }
  const result = await listBusinessProTeam(targetId, current.id);
  if ("error" in result) { res.status(result.error === "not_found" ? 404 : 403).json({ error: "Business Pro team access is not available." }); return; }
  res.json(result);
});

router.post("/business/:targetId/pro/team", async (req, res): Promise<void> => {
  const targetId = targetIdFrom(req.params);
  const current = await viewer(req);
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const role = req.body?.role;
  if (!targetId || !current || !email || !BUSINESS_PRO_TEAM_ROLES.includes(role)) { res.status(400).json({ error: "Provide an existing BLASTERR account email and a valid team role." }); return; }
  const result = await addBusinessProTeamMember(targetId, current.id, email, role);
  if (!("member" in result)) {
    const error = "error" in result ? result.error : "forbidden";
    const status = error === "user_not_found" ? 404 : error === "team_limit" ? 409 : error === "invalid_role" ? 400 : 403;
    res.status(status).json({ error: error === "team_limit" ? "Business Pro includes up to two additional team members." : error === "user_not_found" ? "That email does not belong to an existing BLASTERR account." : "Only the Business Pro owner can manage team access." });
    return;
  }
  res.status(201).json(result.member);
});

router.patch("/business/:targetId/pro/team/:userId", async (req, res): Promise<void> => {
  const targetId = targetIdFrom(req.params);
  const current = await viewer(req);
  const role = req.body?.role;
  if (!targetId || !current || !BUSINESS_PRO_TEAM_ROLES.includes(role)) { res.status(400).json({ error: "Provide a valid team role." }); return; }
  const result = await updateBusinessProTeamMember(targetId, current.id, req.params.userId, role);
  if (!("member" in result)) { res.status("error" in result && result.error === "not_found" ? 404 : 403).json({ error: "error" in result && result.error === "not_found" ? "Team member not found." : "Only the Business Pro owner can manage team access." }); return; }
  res.json(result.member);
});

router.delete("/business/:targetId/pro/team/:userId", async (req, res): Promise<void> => {
  const targetId = targetIdFrom(req.params);
  const current = await viewer(req);
  if (!targetId || !current) { res.status(401).json({ error: "Sign in is required." }); return; }
  const result = await removeBusinessProTeamMember(targetId, current.id, req.params.userId);
  if (!("member" in result)) { res.status("error" in result && result.error === "not_found" ? 404 : 403).json({ error: "error" in result && result.error === "not_found" ? "Team member not found." : "Only the Business Pro owner can manage team access." }); return; }
  res.json(result.member);
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