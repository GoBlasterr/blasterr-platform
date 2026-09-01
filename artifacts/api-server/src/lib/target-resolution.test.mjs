import assert from "node:assert/strict";
import test from "node:test";
import {
  findTargetMatches,
  normalizeTargetText,
  targetIdentityLockKey,
} from "./target-resolution.ts";

const targets = [
  { id: "la", name: "Los Angeles", type: "place", location: "Los Angeles, CA" },
  { id: "atl-cafe", name: "Corner Cafe", type: "business", location: "Atlanta, GA" },
  { id: "la-cafe", name: "Corner Cafe", type: "business", location: "Los Angeles, CA" },
  { id: "springfield-il", name: "Town Market", type: "business", location: "Springfield, IL" },
];

test("normalizes punctuation, case, and accents", () => {
  assert.equal(normalizeTargetText("  L.Á.  "), "l a");
});

test("builds PostgreSQL-safe normalized Target lock keys", () => {
  const key = targetIdentityLockKey({
    type: "person",
    name: "Tupac Shakur",
    location: "",
  });
  assert.equal(key, '["person","tupac shakur",""]');
  assert.equal(key.includes("\u0000"), false);
});

test("resolves L.A. as an alias for Los Angeles", () => {
  const [match] = findTargetMatches(targets, { name: "L.A.", type: "place" });
  assert.equal(match.target.id, "la");
  assert.equal(match.matchKind, "alias");
  assert.equal(match.isHardDuplicate, true);
});

test("surfaces a likely spelling match", () => {
  const [match] = findTargetMatches(targets, { name: "Los Angles", type: "place" });
  assert.equal(match.target.id, "la");
  assert.equal(match.matchKind, "likely");
});

test("uses city to distinguish businesses with the same name", () => {
  const matches = findTargetMatches(targets, {
    name: "Corner Cafe",
    type: "business",
    location: "Atlanta, GA",
  });
  assert.equal(matches[0].target.id, "atl-cafe");
  assert.equal(matches[0].isHardDuplicate, true);
  assert.equal(matches[1].target.id, "la-cafe");
  assert.equal(matches[1].matchKind, "same-name-different-location");
  assert.equal(matches[1].isHardDuplicate, false);
});

test("retains jurisdiction when cities share the same name", () => {
  const [match] = findTargetMatches(targets, {
    name: "Town Market",
    type: "business",
    location: "Springfield, MA",
  });
  assert.equal(match.target.id, "springfield-il");
  assert.equal(match.matchKind, "same-name-different-location");
  assert.equal(match.isHardDuplicate, false);
});
