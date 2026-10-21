import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { identifyUser } from "@/lib/tracking";
import { useAiReferralTracking } from "@/hooks/useAiReferralTracking";

export function useAuth() {
  useAiReferralTracking();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Link anonymous browsing history to the account after login (idempotent)
  const userId = (user as any)?.id;
  useEffect(() => {
    if (userId) identifyUser(userId);
  }, [userId]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
