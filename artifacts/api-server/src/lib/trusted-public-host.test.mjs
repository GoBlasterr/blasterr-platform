import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { originMatchesHost } from "./admin-supabase-auth.ts";
import {
  PUBLIC_HOST_HEADER,
  PUBLIC_HOST_SIGNATURE_HEADER,
  PUBLIC_HOST_TIMESTAMP_HEADER,
  clerkPublicHost,
  hasPublicHostHeaders,
  restoreTrustedPublicHost,
  verifiedPublicHost,
} from "./trusted-public-host.ts";

const secret = "a-32-byte-or-longer-test-only-shared-secret";
const now = 1_790_000_000_000;

function signedHeaders(host = "goblasterr.com", timestamp = now) {
  const time = String(timestamp);
  return {
    [PUBLIC_HOST_HEADER]: host,
    [PUBLIC_HOST_TIMESTAMP_HEADER]: time,
    [PUBLIC_HOST_SIGNATURE_HEADER]: createHmac("sha256", secret)
      .update(`${host}\n${time}`)
      .digest("hex"),
  };
}

test("accepts only a current signed production host", () => {
  assert.equal(verifiedPublicHost(signedHeaders(), secret, now), "goblasterr.com");
  assert.equal(verifiedPublicHost(signedHeaders("www.goblasterr.com"), secret, now), "www.goblasterr.com");
  assert.equal(clerkPublicHost({
    ...signedHeaders(),
    "x-forwarded-host": "blasterr-admin.replit.app",
    host: "blasterr-admin.replit.app",
  }, secret, now), "goblasterr.com");
  assert.equal(clerkPublicHost({
    "x-forwarded-host": "www.goblasterr.com, blasterr-admin.replit.app",
  }, secret, now), "www.goblasterr.com");
  assert.equal(clerkPublicHost({
    "x-forwarded-host": "goblasterr.com",
    host: "blasterr-admin.replit.app",
  }, secret, now), "blasterr-admin.replit.app");
  assert.equal(hasPublicHostHeaders({}), false);
  assert.equal(hasPublicHostHeaders(signedHeaders()), true);
});

test("rejects forged, partial, stale, and unconfigured headers", () => {
  const valid = signedHeaders();
  assert.equal(verifiedPublicHost({ ...valid, [PUBLIC_HOST_HEADER]: "evil.test" }, secret, now), undefined);
  assert.equal(verifiedPublicHost(signedHeaders("evil.test"), secret, now), undefined);
  assert.equal(verifiedPublicHost({ ...valid, [PUBLIC_HOST_SIGNATURE_HEADER]: "0".repeat(64) }, secret, now), undefined);
  assert.equal(verifiedPublicHost({ ...valid, [PUBLIC_HOST_SIGNATURE_HEADER]: undefined }, secret, now), undefined);
  assert.equal(verifiedPublicHost(signedHeaders("goblasterr.com", now - 300_001), secret, now), undefined);
  assert.equal(verifiedPublicHost(signedHeaders("goblasterr.com", now + 30_001), secret, now), undefined);
  assert.equal(verifiedPublicHost(valid, undefined, now), undefined);
  assert.equal(verifiedPublicHost(valid, "too-short", now), undefined);
  assert.equal(verifiedPublicHost({ ...valid, [PUBLIC_HOST_HEADER]: ["goblasterr.com"] }, secret, now), undefined);
});

test("restores the signed apex before Origin checks without rewriting Origin or cookies", () => {
  const headers = {
    ...signedHeaders(),
    host: "blasterr-admin.replit.app",
    "x-forwarded-host": "blasterr-admin.replit.app",
    "x-forwarded-proto": "http",
    origin: "https://goblasterr.com",
    cookie: "test-cookie=untouched",
  };
  assert.equal(restoreTrustedPublicHost(headers, secret, now), true);
  assert.equal(headers["x-forwarded-host"], "goblasterr.com");
  assert.equal(headers["x-forwarded-proto"], "https");
  assert.equal(headers.origin, "https://goblasterr.com");
  assert.equal(headers.cookie, "test-cookie=untouched");
  assert.equal(clerkPublicHost(headers, secret, now), "goblasterr.com");
  assert.equal(originMatchesHost(headers.origin, headers["x-forwarded-host"]), true);

  headers.origin = "https://evil.example";
  assert.equal(restoreTrustedPublicHost(headers, secret, now), true);
  assert.equal(headers.origin, "https://evil.example");
  assert.equal(originMatchesHost(headers.origin, headers["x-forwarded-host"]), false);
});

test("rejects missing, invalid, expired, and replayed-outside-window signatures", () => {
  assert.equal(restoreTrustedPublicHost({
    host: "blasterr-admin.replit.app",
    "x-forwarded-host": "goblasterr.com",
  }, secret, now), false);
  assert.equal(restoreTrustedPublicHost({ host: "goblasterr.com" }, secret, now), false);
  assert.equal(restoreTrustedPublicHost({ ...signedHeaders(), [PUBLIC_HOST_SIGNATURE_HEADER]: undefined }, secret, now), false);
  assert.equal(restoreTrustedPublicHost({ ...signedHeaders(), [PUBLIC_HOST_TIMESTAMP_HEADER]: String(now + 1) }, secret, now), false);
  assert.equal(restoreTrustedPublicHost(signedHeaders(), "different-but-still-32-byte-test-secret", now), false);
  assert.equal(restoreTrustedPublicHost(signedHeaders("goblasterr.com", now - 300_001), secret, now), false);
  assert.equal(restoreTrustedPublicHost({ host: "blasterr-admin.replit.app" }, secret, now), true);
  assert.equal(restoreTrustedPublicHost({
    host: "blasterr-admin.replit.app",
    "x-forwarded-host": "www.goblasterr.com",
  }, secret, now), true);
});