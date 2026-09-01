import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import sharp from "sharp";
import { ObjectStorageService } from "./objectStorage";

export const OPTIMIZED_IMAGE_WIDTHS = [200, 400, 720, 800, 1600] as const;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_INPUT_PIXELS = 20_000_000;
const MAX_ASPECT_RATIO = 20;
const MAX_IPS = 10_000;
const MAX_REQUESTS_PER_IP_PER_MINUTE = 120;
const ALLOWED_SOURCE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ParsedPath = { width: number; sourcePath: string };
type TransformJob = { promise: Promise<Buffer>; cancel: () => void; waiters: number };
const pending = new Map<string, TransformJob>();
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

class CapacityError extends Error {}

class TransformScheduler {
  private active = 0;
  private queue: Array<{ run: () => Promise<Buffer>; resolve: (data: Buffer) => void; reject: (error: Error) => void }> = [];
  private starts: number[] = [];

  enqueue(run: () => Promise<Buffer>): { promise: Promise<Buffer>; cancel: () => void } | null {
    const now = Date.now();
    this.starts = this.starts.filter((started) => started > now - 60_000);
    if (this.queue.length >= 8 || this.active + this.queue.length >= 10 || this.starts.length >= 30) return null;
    let entry!: TransformScheduler["queue"][number];
    const promise = new Promise<Buffer>((resolve, reject) => {
      entry = { run, resolve, reject };
      this.queue.push(entry);
    });
    this.pump();
    return {
      promise,
      cancel: () => {
        const index = this.queue.indexOf(entry);
        if (index >= 0) {
          this.queue.splice(index, 1);
          entry.reject(new CapacityError("Image request aborted"));
        }
      },
    };
  }

  private pump() {
    const now = Date.now();
    this.starts = this.starts.filter((started) => started > now - 60_000);
    if (this.starts.length >= 30) {
      while (this.queue.length) this.queue.shift()!.reject(new CapacityError("Transform budget exhausted"));
      return;
    }
    while (this.active < 2 && this.queue.length) {
      const entry = this.queue.shift()!;
      this.active++;
      this.starts.push(Date.now());
      entry.run().then(entry.resolve, entry.reject).finally(() => {
        this.active--;
        this.pump();
      });
    }
  }
}
const scheduler = new TransformScheduler();

function decodeSafely(value: string): string {
  try { return decodeURIComponent(value); } catch { return "\0"; }
}

export function parseOptimizedImagePath(width: string, filePath: string): ParsedPath | null {
  const parsedWidth = Number(width);
  if (!OPTIMIZED_IMAGE_WIDTHS.includes(parsedWidth as (typeof OPTIMIZED_IMAGE_WIDTHS)[number])) return null;
  if (!filePath || filePath.includes("\0") || filePath.includes("\\") || filePath.includes("?") ||
    filePath.includes("#") || !filePath.startsWith("objects/") || filePath.startsWith("/") || filePath.includes("//")) return null;
  if (filePath.split("/").some((part) => {
    const decoded = decodeSafely(part);
    return !part || decoded === "." || decoded === ".." || decoded.includes("/") ||
      decoded.includes("\\") || decoded.includes("\0");
  })) return null;
  return { width: parsedWidth, sourcePath: `/${filePath}` };
}

export function createOptimizedImageVersion(sourcePath: string, generation: string): string {
  return createHash("sha256").update(`${sourcePath}\0${generation}`).digest("hex");
}

export function parseVersionedOptimizedImagePath(width: string, version: string, filePath: string):
  (ParsedPath & { version: string }) | null {
  const parsed = parseOptimizedImagePath(width, filePath);
  return parsed && /^[a-f0-9]{64}$/.test(version) ? { ...parsed, version } : null;
}

function rateLimit(req: Request): boolean {
  const now = Date.now();
  const key = req.ip || "unknown";
  if (requestBuckets.size >= MAX_IPS) {
    for (const [ip, bucket] of Array.from(requestBuckets)) if (bucket.resetAt <= now) requestBuckets.delete(ip);
    while (requestBuckets.size >= MAX_IPS) {
      const oldest = requestBuckets.keys().next().value as string | undefined;
      if (!oldest) break;
      requestBuckets.delete(oldest);
    }
  }
  const bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  return ++bucket.count <= MAX_REQUESTS_PER_IP_PER_MINUTE;
}

async function transformImage(source: Buffer, width: number): Promise<Buffer> {
  const image = sharp(source, { sequentialRead: true, limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning", pages: 1 });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || "") || !metadata.width || !metadata.height ||
    (metadata.pages && metadata.pages > 1) || metadata.width * metadata.height > MAX_INPUT_PIXELS ||
    Math.max(metadata.width / metadata.height, metadata.height / metadata.width) > MAX_ASPECT_RATIO) {
    throw new Error("Unsupported image input");
  }
  return image.resize({ width, withoutEnlargement: true, fit: "inside" }).webp({ quality: 82 }).toBuffer();
}

async function resolvePublicSource(storage: ObjectStorageService, sourcePath: string) {
  const source = await storage.getObjectEntityFile(sourcePath);
  if (!await storage.canAccessObjectEntity({ objectFile: source })) throw new Error("Source unavailable");
  const [metadata] = await source.getMetadata();
  const size = Number(metadata.size);
  const generation = String(metadata.generation || "");
  if (
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > MAX_SOURCE_BYTES ||
    !generation ||
    !ALLOWED_SOURCE_CONTENT_TYPES.has(
      String(metadata.contentType || "").toLowerCase(),
    )
  ) {
    throw new Error("Source unavailable");
  }
  return { source, generation };
}

function sendCapacityError(res: Response) {
  res.set("Retry-After", "60").status(503).end();
}

export async function optimizedImageDiscoveryHandler(req: Request, res: Response): Promise<void> {
  const parsed = parseOptimizedImagePath(req.params.width, req.params.filePath);
  if (!parsed || !rateLimit(req)) return void res.status(404).end();
  try {
    const { generation } = await resolvePublicSource(new ObjectStorageService(), parsed.sourcePath);
    const version = createOptimizedImageVersion(parsed.sourcePath, generation);
    res.set("Cache-Control", "no-store").redirect(302, `/optimized-images/${parsed.width}/v/${version}${parsed.sourcePath}`);
  } catch (error) {
    console.error("Optimized image discovery failed:", error);
    res.status(404).end();
  }
}

export async function optimizedImageVersionedHandler(req: Request, res: Response): Promise<void> {
  const parsed = parseVersionedOptimizedImagePath(req.params.width, req.params.version, req.params.filePath);
  if (!parsed || !rateLimit(req)) return void res.status(404).end();
  try {
    const storage = new ObjectStorageService();
    const { source, generation } = await resolvePublicSource(storage, parsed.sourcePath);
    if (parsed.version !== createOptimizedImageVersion(parsed.sourcePath, generation)) return void res.status(404).end();
    const cached = await storage.getOptimizedImageFile(parsed.sourcePath, parsed.width, generation);
    if (cached) return void await storage.downloadOptimizedImage(cached, res);
    const key = `${parsed.sourcePath}:${parsed.width}:${generation}`;
    let job = pending.get(key);
    if (!job) {
      const scheduled = scheduler.enqueue(async () => {
        const [data] = await source.download();
        if (data.length < 1 || data.length > MAX_SOURCE_BYTES) throw new Error("Downloaded source size rejected");
        const output = await transformImage(data, parsed.width);
        await storage.saveOptimizedImage(
          parsed.sourcePath,
          parsed.width,
          generation,
          output,
        );
        return output;
      });
      if (!scheduled) return sendCapacityError(res);
      job = { ...scheduled, waiters: 0 };
      pending.set(key, job);
      job.promise.finally(() => pending.delete(key)).catch(() => undefined);
    }
    job.waiters++;
    let aborted = false;
    const abort = () => {
      aborted = true;
      if (--job!.waiters === 0) job!.cancel();
    };
    req.once("aborted", abort);
    try {
      const output = await job.promise;
      if (aborted || res.headersSent) return;
      res.set({ "Content-Type": "image/webp", "Content-Length": String(output.length), "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable" }).send(output);
    } finally {
      req.off("aborted", abort);
      if (!aborted) job.waiters--;
    }
  } catch (error) {
    if (error instanceof CapacityError) sendCapacityError(res);
    else {
      console.error("Optimized image processing failed:", error);
      if (!res.headersSent) res.status(404).end();
    }
  }
}