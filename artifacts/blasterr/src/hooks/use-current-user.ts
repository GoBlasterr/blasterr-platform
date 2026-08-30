import { useAuth } from "@clerk/react";
import { useGetCurrentUser } from "@workspace/api-client-react";

export function getCurrentUserScopedQueryKey(userId: string | null | undefined) {
  return ["/api/me", userId ?? "guest"] as const;
}

export function useCurrentUser() {
  const { isLoaded, userId } = useAuth();

  return useGetCurrentUser({
    query: {
      enabled: isLoaded,
      queryKey: getCurrentUserScopedQueryKey(userId),
    },
  });
}