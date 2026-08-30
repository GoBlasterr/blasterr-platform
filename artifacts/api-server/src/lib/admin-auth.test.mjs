import assert from "node:assert/strict";
import test from "node:test";
import { isActiveAdmin, isSuspended } from "./admin-auth.ts";

test("a suspended role-based admin has no admin access", () => {
  const metadata = { role: "admin", status: "suspended" };
  assert.equal(isSuspended(metadata), true);
  assert.equal(isActiveAdmin(metadata), false);
});

test("a suspended legacy isAdmin user has no admin access", () => {
  assert.equal(isActiveAdmin({ isAdmin: true, status: "suspended" }), false);
});

test("only active admin metadata grants admin access", () => {
  assert.equal(isActiveAdmin({ role: "admin", status: "active" }), true);
  assert.equal(isActiveAdmin({ isAdmin: true }), true);
  assert.equal(isActiveAdmin({ role: "moderator", status: "active" }), false);
});