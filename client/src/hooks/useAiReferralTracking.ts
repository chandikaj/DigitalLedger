import { useEffect } from "react";
import { trackAiReferral } from "@/lib/aiReferralTracking";

/** Records an allowlisted AI referrer once per browser session. */
export function useAiReferralTracking(): void {
  useEffect(() => {
    trackAiReferral();
  }, []);
}