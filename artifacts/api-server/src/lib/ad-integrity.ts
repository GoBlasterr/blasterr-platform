import { createHmac, timingSafeEqual } from "node:crypto";

export type DeliveryTokenPayload = {
  adId: string;
  placement: string;
  sessionId: string;
  tokenId: string;
  expiresAt: number;
};

export function createSignedDeliveryToken(payload: DeliveryTokenPayload, secret: string | undefined): string | null {
  if (!secret) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySignedDeliveryToken(token: string, secret: string | undefined, currentTime = Date.now()): DeliveryTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!secret || !encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest();
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DeliveryTokenPayload;
    return payload.expiresAt > currentTime ? payload : null;
  } catch {
    return null;
  }
}

export const requiresTrustedImpression = (eventType: string, hasTrustedImpression: boolean) =>
  eventType !== "impression" && !hasTrustedImpression;

export const isDuplicateEvent = (existingEventId: string | undefined) => Boolean(existingEventId);

export function frequencyCapRejection(input: {
  adImpressions: number;
  adCap: number | null;
  groupImpressions: number;
  groupCap: number | null;
}): string | null {
  if (input.adCap && input.adImpressions >= input.adCap) return "Advertisement frequency limit reached.";
  if (input.groupCap && input.groupImpressions >= input.groupCap) return "Ad group frequency limit reached.";
  return null;
}

export type FraudReason = "suspicious_velocity" | "repeated_destination" | "abnormal_ctr";

export function detectFraudRules(input: {
  velocityCount: number;
  repeatedDestinationClicks: number;
  impressions: number;
  clicks: number;
  isClick: boolean;
}): { reasons: FraudReason[]; details: Record<string, unknown> } {
  const reasons: FraudReason[] = [];
  const details: Record<string, unknown> = {};
  if (input.velocityCount >= 12) {
    reasons.push("suspicious_velocity");
    details.velocity = { eventCount: input.velocityCount, windowSeconds: 60, threshold: 12 };
  }
  if (input.isClick && input.repeatedDestinationClicks >= 4) {
    reasons.push("repeated_destination");
    details.repeatedDestination = { clickCount: input.repeatedDestinationClicks, windowMinutes: 60, threshold: 4 };
  }
  const ctr = input.impressions > 0 ? input.clicks / input.impressions : 0;
  if (input.isClick && input.impressions >= 5 && input.clicks >= 4 && ctr > 0.6) {
    reasons.push("abnormal_ctr");
    details.clickThroughRate = { impressions: input.impressions, clicks: input.clicks, ctr, threshold: 0.6 };
  }
  return { reasons, details };
}