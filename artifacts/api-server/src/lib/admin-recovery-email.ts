import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
let cachedMailbox: { email: string; expiresAt: number } | null = null;

async function connectedMailbox(): Promise<string> {
  if (cachedMailbox && cachedMailbox.expiresAt > Date.now()) return cachedMailbox.email;

  const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/profile", { method: "GET" });
  if (!response.ok) throw new Error(`Gmail mailbox lookup failed (${response.status}).`);
  const body = await response.json() as { emailAddress?: unknown };
  const email = typeof body.emailAddress === "string" ? body.emailAddress.trim().toLowerCase() : "";
  if (!email) throw new Error("Gmail mailbox address is unavailable.");

  cachedMailbox = { email, expiresAt: Date.now() + 15 * 60_000 };
  return email;
}

export async function sendAdminRecoveryEmail(to: string, recoveryUrl: string): Promise<void> {
  const mailbox = await connectedMailbox();
  if (mailbox !== to.trim().toLowerCase()) {
    throw new Error("Connected Gmail does not match the approved Admin recipient.");
  }

  const message = [
    `From: BLASTERR Admin <${mailbox}>`,
    `To: ${mailbox}`,
    "Subject: Reset your BLASTERR Admin password",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    "A password reset was requested for your BLASTERR Admin account.",
    "",
    "Open this secure link to continue:",
    recoveryUrl,
    "",
    "This link expires in 15 minutes. If you did not request this, ignore this email.",
  ].join("\r\n");
  const raw = Buffer.from(message, "utf8").toString("base64url");

  const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) throw new Error(`Gmail delivery failed (${response.status}).`);
}