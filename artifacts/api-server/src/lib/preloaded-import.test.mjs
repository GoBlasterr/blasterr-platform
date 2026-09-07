import assert from "node:assert/strict";
import test from "node:test";
import { classifyPreloadedImport, parsePreloadedCsv } from "./preloaded-import.ts";
import { findTargetMatches, normalizedTargetTerms } from "./target-resolution.ts";
import { isActiveAdmin } from "./admin-auth.ts";

test("persisted aliases resolve as canonical hard duplicates", () => {
  const [match] = findTargetMatches([{ id: "target-1", name: "Donald Trump", type: "person", location: "", aliases: ["Trump"] }], { name: "Trump", type: "person" });
  assert.equal(match?.matchKind, "alias");
  assert.equal(match?.isHardDuplicate, true);
});
test("create, update, and adoption collision candidates include canonical name and every alias", () => {
  assert.deepEqual(normalizedTargetTerms("New Canonical", ["Existing Normal", "Existing Alias"]), [
    "new canonical", "existing normal", "existing alias",
  ]);
});
test("CSV preview is idempotent and flags malformed and duplicate rows", () => {
  const rows = parsePreloadedCsv(`name,type,aliases,slug,status\nDonald Trump,person,Trump,donald-trump,active\nDonald Trump,person,DJT,donald-trump,active\nBad,row,,,active`);
  const preview = classifyPreloadedImport(rows, new Set(["donald-trump"]));
  assert.equal(preview.filter(row => row.status === "existing").length, 1);
  assert.equal(preview.filter(row => row.status === "duplicate").length, 1);
  assert.equal(preview.filter(row => row.status === "invalid").length, 1);
  assert.equal(classifyPreloadedImport(rows, new Set(["donald-trump"])).some(row => row.status === "create"), false);
});
test("CSV preview rejects an alias collision between otherwise distinct rows", () => {
  const rows = parsePreloadedCsv(`name,type,aliases,slug,status\nAlpha,person,Shared,alpha,active\nBeta,person,Shared,beta,active`);
  const preview = classifyPreloadedImport(rows, new Set());
  assert.equal(preview[0].status, "create");
  assert.equal(preview[1].status, "duplicate");
});
test("only active admins qualify for curated management", () => {
  assert.equal(isActiveAdmin({ role: "admin", status: "active" }), true);
  assert.equal(isActiveAdmin({ role: "admin", status: "suspended" }), false);
  assert.equal(isActiveAdmin({ role: "user", status: "active" }), false);
});