import { Router, type IRouter, type Request } from "express";
import {
  clearAdminSession,
  getAdminSession,
  isAllowedAdminEmail,
  supabaseAuthRequest,
  verifyRecoveryToken,
  writeAdminSession,
} from "../lib/admin-supabase-auth";

const router: IRouter = Router();
const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const password = (value: unknown) => typeof value === "string" ? value : "";

function safeRedirect(req: Request) {
  const configured = process.env.ADMIN_APP_URL?.replace(/\/$/, "");
  if (configured) return `${configured}/reset-password`;
  const host = req.get("host");
  return `${req.protocol}://${host}/blasterr-admin/reset-password`;
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
  await supabaseAuthRequest("/recover", {
    method: "POST",
    body: JSON.stringify({ email, redirect_to: safeRedirect(req) }),
  });
  res.json({ message: "If that Admin account exists, a recovery email has been sent." });
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