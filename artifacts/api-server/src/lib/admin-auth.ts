export type AuthorizationMetadata = Record<string, unknown>;

export function isSuspended(metadata: AuthorizationMetadata): boolean {
  return metadata.status === "suspended";
}

export function isActiveAdmin(metadata: AuthorizationMetadata): boolean {
  return !isSuspended(metadata) && (metadata.role === "admin" || metadata.isAdmin === true);
}