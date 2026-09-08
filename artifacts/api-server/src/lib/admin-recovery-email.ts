import { ReplitConnectors } from "@replit/connectors-sdk";

type VerifiedSender = {
  verified?: boolean;
  from_email?: string;
};

const connectors = new ReplitConnectors();
let cachedSender: { email: string; expiresAt: number } | null = null;

async function verifiedSenderEmail(): Promise<string> {
  if (cachedSender && cachedSender.expiresAt > Date.now()) return cachedSender.email;

  const response = await connectors.proxy("sendgrid", "/v3/verified_senders", { method: "GET" });
  if (!response.ok) throw new Error(`SendGrid sender lookup failed (${response.status}).`);
  const body = await response.json() as { results?: VerifiedSender[] };
  const email = body.results?.find((sender) => sender.verified && sender.from_email)?.from_email;
  if (!email) throw new Error("SendGrid has no verified sender.");

  cachedSender = { email, expiresAt: Date.now() + 15 * 60_000 };
  return email;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendAdminRecoveryEmail(to: string, recoveryUrl: string): Promise<void> {
  const from = await verifiedSenderEmail();
  const safeUrl = escapeHtml(recoveryUrl);
  const response = await connectors.proxy("sendgrid", "/v3/mail/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: "BLASTERR Admin" },
      subject: "Reset your BLASTERR Admin password",
      content: [
        {
          type: "text/plain",
          value: `A password reset was requested for your BLASTERR Admin account.\n\nOpen this secure link to continue:\n${recoveryUrl}\n\nThis link expires in 15 minutes. If you did not request this, ignore this email.`,
        },
        {
          type: "text/html",
          value: `<p>A password reset was requested for your BLASTERR Admin account.</p><p><a href="${safeUrl}">Reset Admin password</a></p><p>This secure link expires in 15 minutes. If you did not request this, ignore this email.</p>`,
        },
      ],
    }),
  });

  // SendGrid returns 202 with an empty body. Never parse it on success.
  if (!response.ok) throw new Error(`SendGrid delivery failed (${response.status}).`);
}