import assert from "node:assert/strict";
import test from "node:test";
import {
  developmentAdminBypassEnabled,
  createRecoveryTicket,
  isAllowedAdminEmail,
  originMatchesHost,
  readRecoveryTicket,
} from "./admin-supabase-auth.ts";

test("only configured Admin emails are approved", () => {
  const before = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "admin@getblaster.com, second@example.com";
  try {
    assert.equal(isAllowedAdminEmail("ADMIN@getblaster.com"), true);
    assert.equal(isAllowedAdminEmail("other@example.com"), false);
    assert.equal(isAllowedAdminEmail(undefined), false);
  } finally {
    if (before === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = before;
  }
});

test("development bypass requires both development mode and the explicit flag", () => {
  const beforeNodeEnv = process.env.NODE_ENV;
  const beforeBypass = process.env.DEV_ADMIN_BYPASS;
  try {
    process.env.NODE_ENV = "development";
    process.env.DEV_ADMIN_BYPASS = "true";
    assert.equal(developmentAdminBypassEnabled(), true);
    process.env.NODE_ENV = "production";
    assert.equal(developmentAdminBypassEnabled(), false);
    process.env.NODE_ENV = "development";
    process.env.DEV_ADMIN_BYPASS = "false";
    assert.equal(developmentAdminBypassEnabled(), false);
  } finally {
    if (beforeNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = beforeNodeEnv;
    if (beforeBypass === undefined) delete process.env.DEV_ADMIN_BYPASS;
    else process.env.DEV_ADMIN_BYPASS = beforeBypass;
  }
});

test("cross-origin Admin mutations are rejected", () => {
  assert.equal(originMatchesHost(undefined, "goblasterr.com"), true);
  assert.equal(originMatchesHost("https://goblasterr.com", "goblasterr.com"), true);
  assert.equal(originMatchesHost("https://attacker.example", "goblasterr.com"), false);
  assert.equal(originMatchesHost("not a url", "goblasterr.com"), false);
});

test("Admin recovery tickets are encrypted, authenticated, and expire", () => {
  const beforeService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const beforeSession = process.env.SESSION_SECRET;
  const beforeUrl = process.env.SUPABASE_URL;
  const beforeAnon = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.SESSION_SECRET = "session-test-secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon-test";
  try {
    const ticket = createRecoveryTicket("hashed-recovery-token", 1_000);
    assert.equal(ticket.includes("hashed-recovery-token"), false);
    assert.equal(readRecoveryTicket(ticket, 1_001), "hashed-recovery-token");
    assert.equal(readRecoveryTicket(`${ticket.slice(0, -1)}x`, 1_001), null);
    assert.equal(readRecoveryTicket(ticket, 1_000 + 15 * 60_000 + 1), null);
  } finally {
    if (beforeService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = beforeService;
    if (beforeSession === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = beforeSession;
    if (beforeUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = beforeUrl;
    if (beforeAnon === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = beforeAnon;
  }
});