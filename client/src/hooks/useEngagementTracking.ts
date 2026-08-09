import { useEffect, useRef } from "react";
import { sendEngagement } from "@/lib/tracking";

const TICK_MS = 5000; // count time in 5s slices
const FLUSH_EVERY_MS = 15000; // send a heartbeat every 15s

/**
 * Tracks active consumption time for a piece of content.
 * Counts time only while `active` is true and the tab is visible;
 * flushes periodically and on hide/unmount so same-day revisits accumulate.
 */
export function useEngagementTracking(
  contentType: "article" | "podcast",
  contentId: string | null | undefined,
  active: boolean = true,
) {
  const pendingRef = useRef(0);
  const lastFlushRef = useRef(Date.now());

  useEffect(() => {
    if (!contentId || !active) return;

    pendingRef.current = 0;
    lastFlushRef.current = Date.now();
    let lastTick = Date.now();

    const flush = (useBeacon = false) => {
      const seconds = pendingRef.current;
      pendingRef.current = 0;
      lastFlushRef.current = Date.now();
      if (seconds >= 1) sendEngagement(contentType, contentId, seconds, useBeacon);
    };

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = Math.min((now - lastTick) / 1000, TICK_MS / 1000 + 2);
      lastTick = now;
      if (document.visibilityState === "visible") {
        pendingRef.current += delta;
      }
      if (now - lastFlushRef.current >= FLUSH_EVERY_MS) flush();
    }, TICK_MS);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush(true);
      } else {
        lastTick = Date.now();
      }
    };
    const onPageHide = () => flush(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flush(true);
    };
  }, [contentType, contentId, active]);
}
