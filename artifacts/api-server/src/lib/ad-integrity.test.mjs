import assert from "node:assert/strict";
import test from "node:test";
import {
  createSignedDeliveryToken,
  detectFraudRules,
  frequencyCapRejection,
  isDuplicateEvent,
  requiresTrustedImpression,
  verifySignedDeliveryToken,
} from "./ad-integrity.ts";

test("signed delivery proofs reject tampering and expiration", () => {
  const payload = { adId: "ad-1", placement: "home_feed", sessionId: "session-123456", tokenId: "token-1", expiresAt: 2_000 };
  const token = createSignedDeliveryToken(payload, "secret");
  assert.ok(token);
  assert.deepEqual(verifySignedDeliveryToken(token, "secret", 1_000), payload);
  assert.equal(verifySignedDeliveryToken(`${token}x`, "secret", 1_000), null);
  assert.equal(verifySignedDeliveryToken(token, "secret", 2_001), null);
});

test("sequence, deduplication, and frequency caps retain their baseline behavior", () => {
  assert.equal(requiresTrustedImpression("click", false), true);
  assert.equal(requiresTrustedImpression("video_view", true), false);
  assert.equal(requiresTrustedImpression("impression", false), false);
  assert.equal(isDuplicateEvent("event-1"), true);
  assert.equal(isDuplicateEvent(undefined), false);
  assert.equal(frequencyCapRejection({ adImpressions: 3, adCap: 3, groupImpressions: 0, groupCap: null }), "Advertisement frequency limit reached.");
  assert.equal(frequencyCapRejection({ adImpressions: 1, adCap: 3, groupImpressions: 5, groupCap: 5 }), "Ad group frequency limit reached.");
  assert.equal(frequencyCapRejection({ adImpressions: 1, adCap: 3, groupImpressions: 2, groupCap: 5 }), null);
});

test("fraud rules flag velocity, repeated destinations, and abnormal CTR at thresholds", () => {
  const result = detectFraudRules({ velocityCount: 12, repeatedDestinationClicks: 4, impressions: 5, clicks: 4, isClick: true });
  assert.deepEqual(result.reasons, ["suspicious_velocity", "repeated_destination", "abnormal_ctr"]);
  assert.deepEqual(detectFraudRules({ velocityCount: 11, repeatedDestinationClicks: 3, impressions: 5, clicks: 3, isClick: true }).reasons, []);
});