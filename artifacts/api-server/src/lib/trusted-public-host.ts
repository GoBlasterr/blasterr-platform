import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export const PUBLIC_HOST_HEADER = "x-blasterr-public-host";
export const PUBLIC_HOST_TIMESTAMP_HEADER = "x-blasterr-public-host-timestamp";
export const PUBLIC_HOST_SIGNATURE_HEADER = "x-blasterr-public-host-signature";

const allowedHosts = new Set(["goblasterr.com", "www.goblasterr.com"]);
const maxAgeMs = 5 * 60_000;
const maxClockSkewMs = 30_000;

export function hasPublicHostHeaders(headers: IncomingHttpHeaders): boolean {
  return [PUBLIC_HOST_HEADER, PUBLIC_HOST_TIMESTAMP_HEADER, PUBLIC_HOST_SIGNATURE_HEADER]
    .some((name) => headers[name] !== undefined);
}

/**
 * Restore the original host only when Vercel has signed it. Ordinary requests
 * to the Replit deployment remain valid without these headers, but an unsigned
 * request cannot claim to originate from the Vercel-hosted apex.
 */
export function restoreTrustedPublicHost(
  headers: IncomingHttpHeaders,
  secret = process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET,
  now = Date.now(),
): boolean {
  if (hasPublicHostHeaders(headers)) {
    const host = verifiedPublicHost(headers, secret, now);
    if (!host) return false;
    headers["x-forwarded-host"] = host;
    headers["x-forwarded-proto"] = "https";
    return true;
  }
  const forwarded = headers["x-forwarded-host"];
  const firstHop = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return firstHop !== "goblasterr.com" && headers.host !== "goblasterr.com";
}

/**
 * Only Vercel's routing middleware may identify the browser-facing hostname.
 * Never derive this value from an unverified client header or an Origin header.
 */
export function verifiedPublicHost(
  headers: IncomingHttpHeaders,
  secret = process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET,
  now = Date.now(),
): string | undefined {
  const host = headers[PUBLIC_HOST_HEADER];
  const timestamp = headers[PUBLIC_HOST_TIMESTAMP_HEADER];
  const signature = headers[PUBLIC_HOST_SIGNATURE_HEADER];
  if (
    typeof host !== "string" || !allowedHosts.has(host) ||
    typeof timestamp !== "string" || !/^\d{13}$/.test(timestamp) ||
    typeof signature !== "string" || !/^[0-9a-f]{64}$/.test(signature) ||
    !secret || Buffer.byteLength(secret, "utf8") < 32
  ) return undefined;

  const issuedAt = Number(timestamp);
  if (issuedAt > now + maxClockSkewMs || now - issuedAt > maxAgeMs) return undefined;

  const expected = createHmac("sha256", secret)
    .update(`${host}\n${timestamp}`)
    .digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected) ? host : undefined;
}

export function clerkPublicHost(
  headers: IncomingHttpHeaders,
  secret = process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET,
  now = Date.now(),
): string | undefined {
  const signed = verifiedPublicHost(headers, secret, now);
  if (signed) return signed;
  const forwarded = headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(",")[0]?.trim();
  // The apex is served by Vercel, never directly by this deployment. It
  // cannot claim an apex Clerk proxy URL without the Vercel signature.
  if (firstHop === "goblasterr.com" || headers.host === "goblasterr.com") {
    return headers.host === "goblasterr.com" ? undefined : headers.host?.trim();
  }
  return firstHop || headers.host?.trim() || undefined;
}