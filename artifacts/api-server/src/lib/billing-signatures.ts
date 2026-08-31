import { createHmac, timingSafeEqual } from "node:crypto";

function signatureParts(header: string): { timestamp: number; signatures: string[] } | null {
  const values = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = Number(values.find(([key]) => key === "t")?.[1]);
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value).filter(Boolean);
  return Number.isSafeInteger(timestamp) && signatures.length > 0 ? { timestamp, signatures } : null;
}

export function verifyStripeSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  const parsed = signatureParts(signatureHeader);
  if (!parsed || Math.abs(Date.now() / 1000 - parsed.timestamp) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${rawBody.toString("utf8")}`)
    .digest();
  return parsed.signatures.some((signature) => {
    const provided = Buffer.from(signature, "hex");
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
}