export type AuthorizationMetadata = Record<string, unknown>;

export function isSuspended(metadata: AuthorizationMetadata): boolean {
  return metadata.status === "suspended";
}

export function isActiveAdmin(metadata: AuthorizationMetadata): boolean {
  return !isSuspended(metadata) && (metadata.role === "admin" || metadata.isAdmin === true);
}

export function canManageOwnedResource(input: {
  actorId: string | null;
  ownerId: string;
  isAdmin: boolean;
  isDevelopmentAdminAction?: boolean;
}): boolean {
  return (
    (!!input.actorId && input.actorId === input.ownerId) ||
    input.isAdmin ||
    input.isDevelopmentAdminAction === true
  );
}

export function canCreateUserContent(actorId: string | null): boolean {
  return !!actorId;
}