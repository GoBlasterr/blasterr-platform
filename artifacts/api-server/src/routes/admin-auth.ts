import { Router, type IRouter, type Request } from "express";
import {
  clearAdminSession,
  createRecoveryTicket,
  exchangeRecoveryToken,
  generateAdminRecoveryToken,
  getAdminSession,
  isAllowedAdminEmail,
  readRecoveryTicket,
  supabaseAuthRequest,
  verifyRecoveryToken,
  writeAdminSession,
} from "../lib/admin-supabase-auth";
import { sendAdminRecoveryEmail } from "../lib/admin-recovery-email";

const router: IRouter = Router();
const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const password = (value: unknown) => typeof value === "string" ? value : "";
const recoveryAttempts = new Map<string, { count: number; resetAt: number }>();

function recoveryRateLimited(email: string): boolean {
  const now = Date.now();
  const current = recoveryAttempts.get(email);
  if (!current || current.resetAt <= now) {
    recoveryAttempts.set(email, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 3;
}

function safeRedirect(req: Request) {
  const configured = process.env.ADMIN_APP_URL?.replace(/\/$/, "");
  if (configured) return `${configured}/reset-password`;
  const host = req.get("host");
  return `${req.protocol}://${host}/blasterr-admin/reset-password`;
}

function recoveryCallbackUrl(ticket: string) {
  const configured = process.env.ADMIN_APP_URL;
  if (!configured) throw new Error("Admin application URL is not configured.");
  const origin = new URL(configured).origin;
  return `${origin}/api/admin-auth/recovery-callback?ticket=${encodeURIComponent(ticket)}`;
}

router.get("/session", async (req, res) => {
  try {
    const session = await getAdminSession(req, res);
    res.json(session ? { authenticated: true, email: session.email } : { authenticated: false });
  } catch {
    res.status(503).json({ error: "Admin authentication is temporarily unavailable." });
  }
});

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const secret = password(req.body?.password);
  if (!isAllowedAdminEmail(email)) return void res.status(403).json({ error: "This email is not approved for Admin access." });
  if (!secret) return void res.status(400).json({ error: "Enter your password." });
  const response = await supabaseAuthRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password: secret }),
  });
  const body = await response.json() as any;
  if (!response.ok) return void res.status(401).json({ error: body.msg ?? body.error_description ?? "Unable to sign in." });
  writeAdminSession(req, res, body);
  res.json({ authenticated: true, email: body.user.email });
});

router.post("/signup", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const secret = password(req.body?.password);
  if (!isAllowedAdminEmail(email)) return void res.status(403).json({ error: "This email is not approved for Admin access." });
  if (secret.length < 6) return void res.status(400).json({ error: "Use at least 6 characters." });
  const response = await supabaseAuthRequest(`/signup?redirect_to=${encodeURIComponent(safeRedirect(req))}`, {
    method: "POST",
    body: JSON.stringify({ email, password: secret }),
  });
  const body = await response.json() as any;
  if (!response.ok) return void res.status(response.status).json({ error: body.msg ?? "Unable to create the Admin account." });
  res.json({ message: body.session ? "Account created. You can sign in now." : "Check your email to verify the new Admin account." });
});

router.post("/recover", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isAllowedAdminEmail(email)) return void res.json({ message: "If that Admin account exists, a recovery email has been sent." });
  if (recoveryRateLimited(email)) {
    res.set("Retry-After", "900");
    return void res.status(429).json({ error: "Too many recovery requests. Try again in 15 minutes." });
  }
  try {
    const hashedToken = await generateAdminRecoveryToken(email);
    const ticket = createRecoveryTicket(hashedToken);
    await sendAdminRecoveryEmail(email, recoveryCallbackUrl(ticket));
    res.json({ message: "Recovery email sent. Check your inbox and spam folder." });
  } catch (error) {
    req.log.error({ err: error instanceof Error ? error.message : "unknown" }, "Unable to deliver Admin recovery email");
    res.status(503).json({ error: "The recovery email could not be delivered. Try again shortly." });
  }
});

router.get("/recovery-callback", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  const ticket = typeof req.query.ticket === "string" ? req.query.ticket : "";
  const hashedToken = ticket ? readRecoveryTicket(ticket) : null;
  const token = hashedToken ? await exchangeRecoveryToken(hashedToken) : null;
  if (!token) {
    res.status(400).send("This recovery link is invalid or expired. Request a new link from BLASTERR Admin.");
    return;
  }
  const target = new URL(safeRedirect(req));
  target.hash = new URLSearchParams({ access_token: token.access_token, type: "recovery" }).toString();
  res.redirect(303, target.toString());
});

router.post("/update-password", async (req, res) => {
  const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken : "";
  const secret = password(req.body?.password);
  if (!accessToken || secret.length < 6) return void res.status(400).json({ error: "Use a valid recovery link and a password of at least 6 characters." });
  const user = await verifyRecoveryToken(accessToken);
  if (!user) return void res.status(401).json({ error: "This recovery link is invalid or expired." });
  const response = await supabaseAuthRequest("/user", {
    method: "PUT",
    body: JSON.stringify({ password: secret }),
  }, accessToken);
  const body = await response.json() as any;
  if (!response.ok) return void res.status(response.status).json({ error: body.msg ?? "Unable to update the password." });
  res.json({ message: "Password updated. You can sign in now." });
});

router.post("/logout", (req, res) => {
  clearAdminSession(req, res);
  res.sendStatus(204);
});

export default router;