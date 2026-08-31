import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyStripeSignature } from "./billing-signatures.ts";
import { reconcileRefunds } from "./billing-accounting.ts";

test("accepts an intact, current Stripe-style signature", () => {
  const body = Buffer.from('{"id":"evt_123","type":"payment_intent.succeeded"}');
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = "whsec_test_only";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body.toString("utf8")}`)
    .digest("hex");

  assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret), true);
});

test("rejects tampered and expired webhook signatures", () => {
  const body = Buffer.from('{"id":"evt_123"}');
  const secret = "whsec_test_only";
  const expired = Math.floor(Date.now() / 1000) - 600;
  const expiredSignature = createHmac("sha256", secret)
    .update(`${expired}.${body.toString("utf8")}`)
    .digest("hex");

  assert.equal(verifyStripeSignature(Buffer.from('{"id":"evt_changed"}'), `t=${expired},v1=${expiredSignature}`, secret), false);
  assert.equal(verifyStripeSignature(body, `t=${expired},v1=${expiredSignature}`, secret), false);
});

test("counts only succeeded refunds and restores settled status after failure", () => {
  assert.deepEqual(
    reconcileRefunds(10_000, "settled", [
      { amountMinor: 2_500, status: "pending" },
      { amountMinor: 1_000, status: "failed" },
    ]),
    { refundedAmountMinor: 0, status: "settled" },
  );
  assert.deepEqual(
    reconcileRefunds(10_000, "partially_refunded", [{ amountMinor: 2_500, status: "failed" }]),
    { refundedAmountMinor: 0, status: "settled" },
  );
  assert.deepEqual(
    reconcileRefunds(10_000, "settled", [{ amountMinor: 2_500, status: "succeeded" }]),
    { refundedAmountMinor: 2_500, status: "partially_refunded" },
  );
});