import assert from "node:assert/strict";
import test from "node:test";
import {
  isReadyOwnedProfileMediaAsset,
  isSafeExternalProfileImage,
  resolveSubmittedProfileMediaReference,
  shouldPreserveProfileMediaReference,
} from "./profile-media-policy.ts";

const readyAvatar = {
  ownerId: "user-1",
  purpose: "avatar",
  lifecycleStatus: "ready",
  contentType: "image/png",
};

test("accepts only HTTPS external profile images", () => {
  assert.equal(isSafeExternalProfileImage("https://img.clerk.com/avatar.png"), true);
  assert.equal(isSafeExternalProfileImage("http://example.com/avatar.png"), false);
  assert.equal(isSafeExternalProfileImage("/api/storage/objects/avatar.png"), false);
  assert.equal(isSafeExternalProfileImage("javascript:alert(1)"), false);
});

test("accepts only ready, owner-matched profile media with the correct purpose", () => {
  assert.equal(isReadyOwnedProfileMediaAsset(readyAvatar, "user-1", "avatar"), true);
  assert.equal(isReadyOwnedProfileMediaAsset({ ...readyAvatar, ownerId: "user-2" }, "user-1", "avatar"), false);
  assert.equal(isReadyOwnedProfileMediaAsset({ ...readyAvatar, purpose: "banner" }, "user-1", "avatar"), false);
  assert.equal(isReadyOwnedProfileMediaAsset({ ...readyAvatar, lifecycleStatus: "pending" }, "user-1", "avatar"), false);
  assert.equal(isReadyOwnedProfileMediaAsset({ ...readyAvatar, lifecycleStatus: "failed" }, "user-1", "avatar"), false);
  assert.equal(isReadyOwnedProfileMediaAsset({ ...readyAvatar, lifecycleStatus: "deleted" }, "user-1", "avatar"), false);
  assert.equal(isReadyOwnedProfileMediaAsset({ ...readyAvatar, contentType: "video/mp4" }, "user-1", "avatar"), false);
  assert.equal(isReadyOwnedProfileMediaAsset(null, "user-1", "avatar"), false);
});

test("display fallbacks cannot erase a stored media identity during unrelated saves", () => {
  assert.equal(shouldPreserveProfileMediaReference(undefined), true);
  assert.equal(shouldPreserveProfileMediaReference(""), true);
  assert.equal(shouldPreserveProfileMediaReference("/api/storage/objects/users/user-1/avatar/new"), false);
  assert.equal(shouldPreserveProfileMediaReference("https://img.clerk.com/avatar.png"), false);
});

test("an unrelated save preserves raw media after failed display hydration", async () => {
  const storedReference = "/api/storage/objects/users/user-1/avatar/existing";
  let replacementValidationCalled = false;
  const result = await resolveSubmittedProfileMediaReference("", storedReference, async () => {
    replacementValidationCalled = true;
    throw new Error("R2 temporarily unavailable");
  });
  assert.equal(result, storedReference);
  assert.equal(replacementValidationCalled, false);
});

test("a replacement still passes through full media validation", async () => {
  const replacement = "/api/storage/objects/users/user-1/avatar/new";
  let validatedValue = "";
  const result = await resolveSubmittedProfileMediaReference(replacement, "old", async (value) => {
    validatedValue = value;
    return "canonical-new";
  });
  assert.equal(validatedValue, replacement);
  assert.equal(result, "canonical-new");
});