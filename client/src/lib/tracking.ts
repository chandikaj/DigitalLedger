// Lightweight engagement/popup tracking. Never throws — tracking failures
// must not break browsing.

const ANON_ID_KEY = "dl_anon_id";

export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id || id.length < 8) {
      // Recover from the cookie backup if localStorage was cleared
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ANON_ID_KEY}=([\\w-]{8,64})`));
      if (match) {
        localStorage.setItem(ANON_ID_KEY, match[1]);
        return match[1];
      }
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(ANON_ID_KEY, id);
      // Long-lived cookie backup in case localStorage is cleared separately
      document.cookie = `${ANON_ID_KEY}=${id}; path=/; max-age=${60 * 60 * 24 * 365 * 2}; SameSite=Lax`;
    }
    return id;
  } catch {
    return "anon-fallback";
  }
}

/** Send an engagement heartbeat/flush. Uses sendBeacon when the page may be unloading. */
export function sendEngagement(
  contentType: "article" | "podcast",
  contentId: string,
  seconds: number,
  useBeacon = false,
): void {
  if (seconds < 1) return;
  const payload = {
    anonId: getAnonId(),
    contentType,
    contentId,
    seconds: Math.min(Math.round(seconds), 120),
  };
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track/engagement",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
    } else {
      fetch("/api/track/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "include",
      }).catch(() => {});
    }
  } catch {
    // never break the page over tracking
  }
}

export type PopupTrigger = "hero" | "exit_intent" | "video_promo" | "article_cta" | "other";

export async function trackPopupOpen(
  trigger: PopupTrigger,
  details?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const res = await fetch("/api/track/popup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId: getAnonId(), trigger, details }),
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}

export function trackPopupUpdate(
  eventId: string,
  updates: { emailEntered?: boolean; subscribed?: boolean; details?: Record<string, unknown> },
): void {
  try {
    fetch(`/api/track/popup/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, anonId: getAnonId() }),
      keepalive: true,
      credentials: "include",
    }).catch(() => {});
  } catch {
    // noop
  }
}

let identifyInFlight = false;

/** Link the anonymous ID to the logged-in user (once per user per browser). */
export function identifyUser(userId: string): void {
  try {
    const key = `dl_anon_linked_${userId}`;
    if (identifyInFlight || localStorage.getItem(key)) return;
    identifyInFlight = true;
    fetch("/api/track/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId: getAnonId() }),
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) localStorage.setItem(key, "1");
      })
      .catch(() => {})
      .finally(() => {
        identifyInFlight = false;
      });
  } catch {
    // noop
  }
}
