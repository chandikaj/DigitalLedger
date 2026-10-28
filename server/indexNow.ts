// IndexNow tells participating search engines (Bing, which also feeds
// ChatGPT search and Copilot, plus Yandex, Seznam, Naver) that a URL was
// added, changed, or removed, so they recrawl it within minutes instead of
// waiting for the next sitemap visit.
//
// Setup: set INDEXNOW_KEY to 8–128 letters, digits, or dashes. The key is
// served at /<key>.txt to prove ownership. Without the key this is a no-op.
import { getConfiguredPublicOrigin, isPublicContent, type PublicContentStatus } from "./shared/seo";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && KEY_PATTERN.test(key) ? key : null;
}

async function submitUrls(urls: string[]): Promise<void> {
  const key = getIndexNowKey();
  // Only the live site may announce URLs; dev and preview runs stay quiet.
  if (!key || process.env.NODE_ENV !== "production" || urls.length === 0) return;

  const origin = getConfiguredPublicOrigin();
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(origin).host,
        key,
        keyLocation: `${origin}/${key}.txt`,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(`IndexNow submission failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("IndexNow submission failed:", message);
  }
}

/**
 * Announces a saved article or podcast episode. Pass `visibilityChanged`
 * when it was published, unpublished, archived, or restored, so engines
 * also learn about removals; otherwise only public records are announced.
 * Never throws and never delays the caller.
 */
export function notifyContentChanged(
  kind: "news" | "podcasts",
  record: (PublicContentStatus & { id: string }) | null | undefined,
  visibilityChanged = false,
): void {
  if (!record) return;
  if (!visibilityChanged && !isPublicContent(record)) return;

  const origin = getConfiguredPublicOrigin();
  const urls = [`${origin}/${kind}/${encodeURIComponent(record.id)}`, `${origin}/${kind}`];
  if (kind === "news") urls.push(`${origin}/`);
  void submitUrls(urls);
}
