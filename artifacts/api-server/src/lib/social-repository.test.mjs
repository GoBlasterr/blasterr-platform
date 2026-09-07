import assert from "node:assert/strict";
import test from "node:test";
import { shouldBootstrapSocialFixtures } from "./social-bootstrap-policy.ts";

test("social fixture bootstrap requires explicit development opt-in", () => {
  assert.equal(shouldBootstrapSocialFixtures("development"), false);
  assert.equal(shouldBootstrapSocialFixtures("development", "true"), true);
  assert.equal(shouldBootstrapSocialFixtures("production", "true"), false);
  assert.equal(shouldBootstrapSocialFixtures("test", "true"), false);
});

test("social join-table uniqueness is represented by the database schema", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../../../../lib/db/src/schema/social.ts", import.meta.url), "utf8"),
  );
  assert.match(source, /primaryKey\(\{ columns: \[table\.followerId, table\.followingId\] \}\)/);
  assert.match(source, /primaryKey\(\{ columns: \[table\.blastId, table\.userId\] \}\)/);
  assert.match(source, /primaryKey\(\{ columns: \[table\.userId, table\.blastId\] \}\)/);
});

test("state toggles and target creation are transaction-serialized", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("./social-repository.ts", import.meta.url), "utf8"),
  );
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /follow:\$\{followerId\}/);
  assert.match(source, /bookmark:\$\{userId\}/);
  assert.match(source, /reaction:\$\{userId\}/);
  assert.match(source, /block:\$\{blockerId\}/);
});