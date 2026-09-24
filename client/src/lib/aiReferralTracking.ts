export type AiReferralSource =
  | "chatgpt"
  | "perplexity"
  | "claude"
  | "copilot"
  | "gemini";

const AI_REFERRER_HOSTS: ReadonlyArray<{
  source: AiReferralSource;
  hosts: readonly string[];
}> = [
  { source: "chatgpt", hosts: ["chatgpt.com", "chat.openai.com"] },
  { source: "perplexity", hosts: ["perplexity.ai"] },
  { source: "claude", hosts: ["claude.ai"] },
  { source: "copilot", hosts: ["copilot.microsoft.com"] },
  { source: "gemini", hosts: ["gemini.google.com"] },
];

const SESSION_DEDUPLICATION_KEY = "dl_ai_referral_tracked";
let trackedWithoutSessionStorage = false;

declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
  }

  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function hostMatches(hostname: string, allowedHost: string): boolean {
  return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
}

/**
 * Classifies a referrer without returning or retaining its full URL.
 * Only explicitly allowed hosts and their subdomains are recognized.
 */
export function classifyAiReferrer(referrer: string): AiReferralSource | null {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    for (const entry of AI_REFERRER_HOSTS) {
      if (entry.hosts.some((host) => hostMatches(hostname, host))) {
        return entry.source;
      }
    }
  } catch {
    // Invalid or unavailable referrer.
  }

  return null;
}

function analyticsPrivacySignalEnabled(): boolean {
  const doNotTrack =
    navigator.doNotTrack ??
    (window as Window & { doNotTrack?: string }).doNotTrack;

  return navigator.globalPrivacyControl === true ||
    doNotTrack === "1" ||
    doNotTrack?.toLowerCase() === "yes";
}

/**
 * Queues one privacy-minimized GA event per browser session. The event contains
 * only the allowlisted provider name as its custom parameter. GA can still add
 * its standard page, session, and referrer context to events it processes.
 * This app has no separate analytics-consent setting; GPC and DNT suppress both
 * the base GA loader and this custom event.
 */
export function trackAiReferral(referrer?: string): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (analyticsPrivacySignalEnabled()) return;

  const source = classifyAiReferrer(referrer ?? document.referrer);
  if (!source || typeof window.gtag !== "function") return;

  let alreadyTracked = trackedWithoutSessionStorage;
  try {
    alreadyTracked ||= sessionStorage.getItem(SESSION_DEDUPLICATION_KEY) === "1";
  } catch {
    // Fall back to the in-memory session marker when storage is unavailable.
  }
  if (alreadyTracked) return;

  trackedWithoutSessionStorage = true;
  try {
    window.gtag("event", "ai_referral_visit", {
      referral_source: source,
    });
  } catch {
    // Analytics failures must never break browsing.
  }

  try {
    sessionStorage.setItem(SESSION_DEDUPLICATION_KEY, "1");
  } catch {
    // The in-memory marker still deduplicates within this page session.
  }
}