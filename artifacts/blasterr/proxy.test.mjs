import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import proxy from "./proxy.ts";

const secret = "test-only-signing-secret-with-at-least-thirty-two-bytes";

test("Vercel signs its own apex host instead of trusting browser headers", () => {
  process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET = secret;
  const response = proxy(new Request("https://goblasterr.com/api/__clerk/v1/client", {
    headers: {
      origin: "https://goblasterr.com",
      "x-blasterr-public-host": "evil.test",
      "x-blasterr-public-host-signature": "forged",
    },
  }));
  const host = response.headers.get("x-middleware-request-x-blasterr-public-host");
  const timestamp = response.headers.get("x-middleware-request-x-blasterr-public-host-timestamp");
  const signature = response.headers.get("x-middleware-request-x-blasterr-public-host-signature");
  assert.equal(host, "goblasterr.com");
  assert.match(timestamp, /^\d{13}$/);
  assert.equal(signature, createHmac("sha256", secret).update(`${host}\n${timestamp}`).digest("hex"));
  assert.equal(response.headers.get("x-middleware-request-origin"), "https://goblasterr.com");
});

test("production API fails closed without signing configuration", () => {
  delete process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET;
  const response = proxy(new Request("https://goblasterr.com/api/me"));
  assert.equal(response.status, 503);
  assert.equal(proxy(new Request("https://goblasterr.com/home")).status, 200);
});