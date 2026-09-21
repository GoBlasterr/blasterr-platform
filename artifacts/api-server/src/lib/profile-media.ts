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

const readableMediaCache = new Map<string, { expiresAt: number; value: string }>();
const readableMediaInFlight = new Map<string, Promise<string>>();
const READABLE_MEDIA_CACHE_TTL_MS = 30_000;

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
  const cacheKey = `${ownerId}:${purpose}:${value}`;
  const cached = readableMediaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  readableMediaCache.delete(cacheKey);

  const existing = readableMediaInFlight.get(cacheKey);
  if (existing) return existing;

  const verification = (async () => {
    try {
      const ready = await readyOwnedAsset(value, ownerId, purpose);
      if (!ready) return "";
      await confirmR2ObjectExists(ready.objectKey);
      const result = canonicalObjectUrl(ready.objectKey);
      readableMediaCache.set(cacheKey, { expiresAt: Date.now() + READABLE_MEDIA_CACHE_TTL_MS, value: result });
      return result;
    } catch {
      return "";
    } finally {
      readableMediaInFlight.delete(cacheKey);
    }
  })();
  readableMediaInFlight.set(cacheKey, verification);
  return verification;
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