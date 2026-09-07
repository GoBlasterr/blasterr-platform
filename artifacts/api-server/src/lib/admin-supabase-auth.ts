import type { NextFunction, Request, Response as ExpressResponse } from "express";

type SupabaseUser = { id: string; email?: string };
type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseUser;
};

const ACCESS_COOKIE = "blasterr_admin_access";
const REFRESH_COOKIE = "blasterr_admin_refresh";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase Admin Auth is not configured.");
  return { url, anonKey };
}

function allowedEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedAdminEmail(email: string | undefined): boolean {
  return Boolean(email && allowedEmails().has(email.toLowerCase()));
}

export function developmentAdminBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_ADMIN_BYPASS === "true";
}

export function originMatchesHost(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function cookies(req: Request): Record<string, string> {
  return Object.fromEntries(
    (req.headers.cookie ?? "").split(";").map((entry) => {
      const [name, ...parts] = entry.trim().split("=");
      return [name, decodeURIComponent(parts.join("="))];
    }).filter(([name]) => Boolean(name)),
  );
}

function cookieOptions(req: Request, maxAge: number) {
  return {
    httpOnly: true,
    secure: req.secure || req.get("x-forwarded-proto") === "https",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function setSession(req: Request, res: ExpressResponse, token: TokenResponse) {
  res.cookie(ACCESS_COOKIE, token.access_token, cookieOptions(req, (token.expires_in ?? 3600) * 1000));
  res.cookie(REFRESH_COOKIE, token.refresh_token, cookieOptions(req, 30 * 24 * 60 * 60 * 1000));
}

export function clearAdminSession(req: Request, res: ExpressResponse) {
  res.clearCookie(ACCESS_COOKIE, cookieOptions(req, 0));
  res.clearCookie(REFRESH_COOKIE, cookieOptions(req, 0));
}

export async function supabaseAuthRequest(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<globalThis.Response> {
  const { url, anonKey } = config();
  return fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken ?? anonKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

async function userForToken(accessToken: string): Promise<SupabaseUser | null> {
  const response = await supabaseAuthRequest("/user", { method: "GET" }, accessToken);
  return response.ok ? await response.json() as SupabaseUser : null;
}

async function refresh(req: Request, res: ExpressResponse): Promise<TokenResponse | null> {
  const refreshToken = cookies(req)[REFRESH_COOKIE];
  if (!refreshToken) return null;
  const response = await supabaseAuthRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  const token = await response.json() as TokenResponse;
  setSession(req, res, token);
  return token;
}

export async function getAdminSession(req: Request, res: ExpressResponse) {
  let accessToken: string | undefined = cookies(req)[ACCESS_COOKIE];
  let user = accessToken ? await userForToken(accessToken) : null;
  if (!user) {
    const token = await refresh(req, res);
    accessToken = token?.access_token;
    user = token?.user ?? null;
  }
  if (!user || !isAllowedAdminEmail(user.email)) return null;
  return { id: user.id, email: user.email!, accessToken: accessToken! };
}

function sameOrigin(req: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  return originMatchesHost(req.get("origin"), req.get("x-forwarded-host") || req.get("host"));
}

export async function requireSupabaseAdmin(req: Request, res: ExpressResponse, next: NextFunction) {
  const developmentBypass = developmentAdminBypassEnabled();
  if (developmentBypass) {
    res.locals.adminActorId = "development-admin";
    next();
    return;
  }
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Invalid request origin." });
    return;
  }
  try {
    const session = await getAdminSession(req, res);
    if (!session) {
      clearAdminSession(req, res);
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    res.locals.adminActorId = session.id;
    res.locals.adminEmail = session.email;
    next();
  } catch (error) {
    req.log.warn({ err: error }, "Unable to verify Supabase Admin session");
    res.status(503).json({ error: "Admin authentication is temporarily unavailable." });
  }
}

export function writeAdminSession(req: Request, res: ExpressResponse, token: TokenResponse) {
  setSession(req, res, token);
}

export async function verifyRecoveryToken(accessToken: string) {
  const user = await userForToken(accessToken);
  return user && isAllowedAdminEmail(user.email) ? user : null;
}