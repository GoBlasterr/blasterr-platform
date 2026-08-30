import assert from "node:assert/strict";
import test from "node:test";
import { canCreateUserContent, canManageOwnedResource, isActiveAdmin, isSuspended } from "./admin-auth.ts";

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

test("owned-resource changes require the owner or an authorized admin", () => {
  assert.equal(canManageOwnedResource({ actorId: null, ownerId: "owner", isAdmin: false }), false);
  assert.equal(canManageOwnedResource({ actorId: "other", ownerId: "owner", isAdmin: false }), false);
  assert.equal(canManageOwnedResource({ actorId: "owner", ownerId: "owner", isAdmin: false }), true);
  assert.equal(canManageOwnedResource({ actorId: "admin", ownerId: "owner", isAdmin: true }), true);
});

test("anonymous content creation is limited to development fixtures", () => {
  assert.equal(canCreateUserContent(null, "production"), false);
  assert.equal(canCreateUserContent(null, "test"), false);
  assert.equal(canCreateUserContent(null, "development"), true);
  assert.equal(canCreateUserContent("user-1", "production"), true);
});