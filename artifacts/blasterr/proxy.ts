import { createHmac } from "node:crypto";
import { next } from "@vercel/functions";

const PUBLIC_HOST_HEADER = "x-blasterr-public-host";
const TIMESTAMP_HEADER = "x-blasterr-public-host-timestamp";
const SIGNATURE_HEADER = "x-blasterr-public-host-signature";
const productionHosts = new Set(["goblasterr.com", "www.goblasterr.com"]);

/**
 * Vercel rewrites /api to the Replit API, which otherwise sees only the
 * Replit hostname. Attach the original public host as a signed request header
 * before the rewrite; the API validates it before any Clerk or API processing.
 */
export default function proxy(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) return next();

  const headers = new Headers(request.headers);
  // Ignore anything supplied by the browser under these names.
  headers.delete(PUBLIC_HOST_HEADER);
  headers.delete(TIMESTAMP_HEADER);
  headers.delete(SIGNATURE_HEADER);

  if (productionHosts.has(url.hostname)) {
    const secret = process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET;
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
      return new Response("Public API proxy is not configured.", { status: 503 });
    }
    const timestamp = Date.now().toString();
    const signature = createHmac("sha256", secret)
      .update(`${url.hostname}\n${timestamp}`)
      .digest("hex");
    headers.set(PUBLIC_HOST_HEADER, url.hostname);
    headers.set(TIMESTAMP_HEADER, timestamp);
    headers.set(SIGNATURE_HEADER, signature);
  }

  return next({ request: { headers } });
}