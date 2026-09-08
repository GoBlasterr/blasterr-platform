import assert from "node:assert/strict";
import test from "node:test";
import { extractInterfaceCopy, normalizeInterfaceCopy } from "./interface-localization.ts";

test("extracts literal interface copy without dynamic expressions", () => {
  const source = `<button aria-label="Open menu"> Hello world {user.name}</button>
    <input placeholder="Search BLASTERR" />
    {ready ? "Continue" : "Please wait"}`;
  const copy = extractInterfaceCopy(source);
  assert.deepEqual(new Set(copy), new Set(["Open menu", "Hello world", "Search BLASTERR", "Continue", "Please wait"]));
  assert.equal(copy.includes("user.name"), false);
});

test("normalizes interface whitespace consistently", () => {
  assert.equal(normalizeInterfaceCopy("  Hello\n   world  "), "Hello world");
});