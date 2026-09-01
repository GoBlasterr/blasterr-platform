export type ProfileMediaPurpose = "avatar" | "banner";

export type ProfileMediaAssetPolicyFields = {
  ownerId: string;
  purpose: string;
  lifecycleStatus: string;
  contentType: string;
};

export function isSafeExternalProfileImage(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isReadyOwnedProfileMediaAsset(
  asset: ProfileMediaAssetPolicyFields | null,
  ownerId: string,
  purpose: ProfileMediaPurpose,
): boolean {
  return Boolean(
    asset &&
    asset.ownerId === ownerId &&
    asset.purpose === purpose &&
    asset.lifecycleStatus === "ready" &&
    asset.contentType.startsWith("image/"),
  );
}

export function shouldPreserveProfileMediaReference(value: string | undefined): boolean {
  return value === undefined || value === "";
}

export async function resolveSubmittedProfileMediaReference(
  submittedValue: string | undefined,
  storedValue: string,
  validateReplacement: (value: string) => Promise<string>,
): Promise<string> {
  if (shouldPreserveProfileMediaReference(submittedValue)) return storedValue;
  return validateReplacement(submittedValue!);
}