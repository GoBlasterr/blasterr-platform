import { confirmR2ObjectExists, headR2Object, isR2ObjectPath, keyFromObjectPath, objectPathForKey } from "./r2";
import { mediaByObjectKey } from "./media-repository";
import {
  isReadyOwnedProfileMediaAsset,
  isSafeExternalProfileImage,
  type ProfileMediaPurpose,
} from "./profile-media-policy";

export class ProfileMediaValidationError extends Error {
  constructor(message = "The selected profile image is not a completed upload.") {
    super(message);
    this.name = "ProfileMediaValidationError";
  }
}

function canonicalObjectUrl(objectKey: string): string {
  return `/api/storage${objectPathForKey(objectKey)}`;
}

async function readyOwnedAsset(value: string, ownerId: string, purpose: ProfileMediaPurpose) {
  const objectKey = keyFromObjectPath(value);
  if (!objectKey) return null;
  const asset = await mediaByObjectKey(objectKey);
  if (!isReadyOwnedProfileMediaAsset(asset, ownerId, purpose)) return null;
  return { asset, objectKey };
}

export async function readableProfileMedia(
  value: string,
  ownerId: string,
  purpose: ProfileMediaPurpose,
): Promise<string> {
  if (!value) return "";
  if (!isR2ObjectPath(value)) return isSafeExternalProfileImage(value) ? value : "";
  const ready = await readyOwnedAsset(value, ownerId, purpose);
  if (!ready) return "";
  try {
    await confirmR2ObjectExists(ready.objectKey);
    return canonicalObjectUrl(ready.objectKey);
  } catch {
    return "";
  }
}

export async function validateProfileMediaUpdate(input: {
  value: string;
  currentValue: string;
  ownerId: string;
  purpose: ProfileMediaPurpose;
  trustedExternalUrl?: string;
}): Promise<string> {
  if (!input.value) return "";
  if (!isR2ObjectPath(input.value)) {
    const trusted = input.value === input.currentValue || input.value === input.trustedExternalUrl;
    if (trusted && isSafeExternalProfileImage(input.value)) return input.value;
    throw new ProfileMediaValidationError("Profile images must come from a verified upload.");
  }
  const ready = await readyOwnedAsset(input.value, input.ownerId, input.purpose);
  if (!ready) throw new ProfileMediaValidationError();
  try {
    await headR2Object(ready.objectKey);
  } catch {
    throw new ProfileMediaValidationError("The uploaded profile image is missing. Please upload it again.");
  }
  return canonicalObjectUrl(ready.objectKey);
}