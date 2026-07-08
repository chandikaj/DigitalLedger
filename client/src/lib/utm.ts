const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
];

const STORAGE_KEY = "captured_utm_params";

export function captureUtmParams(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const captured: Record<string, string> = {};
    for (const key of TRACKED_PARAMS) {
      const value = params.get(key);
      if (value) captured[key] = value;
    }
    if (Object.keys(captured).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
    }
  } catch {
    // sessionStorage unavailable; ignore
  }
}

export function getUtmSearch(): string {
  const params = new URLSearchParams();
  try {
    const current = new URLSearchParams(window.location.search);
    for (const key of TRACKED_PARAMS) {
      const value = current.get(key);
      if (value) params.set(key, value);
    }
    if (Array.from(params.keys()).length === 0) {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>;
        for (const [key, value] of Object.entries(parsed)) {
          if (TRACKED_PARAMS.includes(key) && value) params.set(key, value);
        }
      }
    }
  } catch {
    // ignore
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}
