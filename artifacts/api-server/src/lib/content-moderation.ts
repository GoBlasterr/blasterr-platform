import { adminBlockedWordsTable, db } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type ModerationMatch = {
  action: "block" | "flag";
  termId: string;
} | null;

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function evaluateModeratedText(value: string): Promise<ModerationMatch> {
  const normalized = normalizeForMatch(value);
  if (!normalized) return null;
  const terms = await db.select({
    id: adminBlockedWordsTable.id,
    term: adminBlockedWordsTable.term,
    action: adminBlockedWordsTable.action,
  }).from(adminBlockedWordsTable).where(and(
    eq(adminBlockedWordsTable.status, "active"),
  ));
  const paddedText = ` ${normalized} `;
  const match = terms.find((term) => paddedText.includes(` ${normalizeForMatch(term.term)} `));
  if (!match || (match.action !== "block" && match.action !== "flag")) return null;
  return { action: match.action, termId: match.id };
}