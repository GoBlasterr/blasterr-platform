import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = (name: string) =>
  readFile(new URL(`./${name}`, import.meta.url), "utf8");

test("social schema declares normalized identity, relationship, and feed protections", async () => {
  const social = await schema("social.ts");

  assert.match(social, /targets_normalized_identity_unique/);
  assert.match(social, /follows_no_self_follow/);
  assert.match(social, /blocks_no_self_block/);
  assert.match(social, /original_blast_id"\)\.references/);
  assert.match(social, /parent_comment_id"\)\.references/);
  assert.match(social, /onDelete: "cascade"/);
  assert.match(social, /blasts_counts_nonnegative/);
});

test("advertising schema protects schedules, money, and immutable ownership", async () => {
  const advertising = await schema("advertising.ts");

  assert.match(advertising, /ad_campaigns_schedule_check/);
  assert.match(advertising, /ad_campaigns_amounts_nonnegative/);
  assert.match(advertising, /ad_transactions_amounts_nonnegative/);
  assert.match(advertising, /ad_spend_ledger_amounts_nonnegative/);
  assert.match(advertising, /onDelete: "restrict"/);
  assert.match(advertising, /onDelete: "set null"/);
});