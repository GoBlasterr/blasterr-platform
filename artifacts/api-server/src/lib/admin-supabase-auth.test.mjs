import assert from "node:assert/strict";
import test from "node:test";
import {
  developmentAdminBypassEnabled,
  isAllowedAdminEmail,
  originMatchesHost,
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