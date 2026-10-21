import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type {
  ObjectAclPolicy,
} from "./objectAcl";
import { ObjectPermission } from "./objectAcl";
import {
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
export type OwnedUploadPurpose = "image" | "audio";
const OWNED_UPLOAD_PREFIX = "uploads/v3";
const OWNED_UPLOAD_TTL_MS = 15 * 60 * 1000;
const OWNED_UPLOAD_PATTERN =
  /^\/objects\/uploads\/v3\/(image|audio)\/([0-9]{10})\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/;

function getUploadSigningSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for secure uploads");
  return secret;
}

function signOwnedUploadId(
  owner: string,
  purpose: OwnedUploadPurpose,
  expiresAt: number,
  objectId: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${owner}\0${purpose}\0${expiresAt}\0${objectId}`)
    .digest("base64url");
}

export function createOwnedUploadObjectPath(
  owner: string,
  purpose: OwnedUploadPurpose,
  objectId: string = randomUUID(),
  secret: string = getUploadSigningSecret(),
  expiresAt: number = Date.now() + OWNED_UPLOAD_TTL_MS,
): string {
  const expiresAtSeconds = Math.floor(expiresAt / 1000);
  if (
    !owner ||
    !/^[0-9a-f-]{36}$/i.test(objectId) ||
    !Number.isSafeInteger(expiresAtSeconds)
  ) {
    throw new Error("Invalid upload identity");
  }
  const signature = signOwnedUploadId(
    owner,
    purpose,
    expiresAtSeconds,
    objectId,
    secret,
  );
  return `/objects/${OWNED_UPLOAD_PREFIX}/${purpose}/${expiresAtSeconds}.${objectId}.${signature}`;
}

export function isOwnedUploadObjectPath(
  objectPath: string,
  owner: string,
  purpose: OwnedUploadPurpose,
  secret: string = getUploadSigningSecret(),
  now: number = Date.now(),
): boolean {
  if (!owner) return false;
  const match = OWNED_UPLOAD_PATTERN.exec(objectPath);
  if (!match || match[1] !== purpose) return false;
  const expiresAtSeconds = Number(match[2]);
  if (
    !Number.isSafeInteger(expiresAtSeconds) ||
    expiresAtSeconds * 1000 < now
  ) {
    return false;
  }
  const actual = Buffer.from(match[4], "utf8");
  const expected = Buffer.from(
    signOwnedUploadId(
      owner,
      purpose,
      expiresAtSeconds,
      match[3],
      secret,
    ),
    "utf8",
  );
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

export type OwnedUploadConstraints = {
  allowedContentTypes: ReadonlySet<string>;
  maxBytes: number;
};

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class OwnedUploadValidationError extends Error {
  constructor() {
    super("Invalid owned upload");
    this.name = "OwnedUploadValidationError";
    Object.setPrototypeOf(this, OwnedUploadValidationError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Get the ACL policy for the object.
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  createOwnedUploadTarget(
    owner: string,
    purpose: OwnedUploadPurpose,
  ): { objectPath: string; uploadURL: string } {
    const objectPath = createOwnedUploadObjectPath(owner, purpose);
    const uploadId = objectPath.slice(
      `/objects/${OWNED_UPLOAD_PREFIX}/${purpose}/`.length,
    );
    return {
      objectPath,
      uploadURL: `/api/objects/upload/${purpose}/${uploadId}`,
    };
  }

  async storeOwnedUpload({
    objectPath,
    owner,
    purpose,
    source,
    contentType,
    maxBytes,
  }: {
    objectPath: string;
    owner: string;
    purpose: OwnedUploadPurpose;
    source: Readable;
    contentType: string;
    maxBytes: number;
  }): Promise<void> {
    if (!isOwnedUploadObjectPath(objectPath, owner, purpose)) {
      throw new OwnedUploadValidationError();
    }
    const objectFile = this.getObjectEntityFileReference(objectPath);
    const [alreadyExists] = await objectFile.exists();
    if (alreadyExists) throw new OwnedUploadValidationError();
    let received = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        callback(
          received <= maxBytes
            ? null
            : new OwnedUploadValidationError(),
          received <= maxBytes ? chunk : undefined,
        );
      },
    });
    const destination = objectFile.createWriteStream({
      resumable: false,
      validation: "crc32c",
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: {
        contentType,
        cacheControl: "private, no-store",
      },
    });
    try {
      await pipeline(source, limiter, destination);
      if (received < 1) throw new OwnedUploadValidationError();
    } catch (error) {
      const status = Number((error as { code?: unknown }).code);
      if (status !== 412) {
        await objectFile.delete({ ignoreNotFound: true }).catch(() => undefined);
      }
      throw status === 412 ? new OwnedUploadValidationError() : error;
    }
  }

  async uploadPublicObject({
    data,
    contentType,
    extension,
    owner,
  }: {
    data: Buffer;
    contentType: "image/png" | "image/jpeg" | "image/webp";
    extension: "png" | "jpg" | "webp";
    owner: string;
  }): Promise<string> {
    let privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir.endsWith("/")) {
      privateObjectDir = `${privateObjectDir}/`;
    }

    const entityId = `article-imports/${randomUUID()}.${extension}`;
    const { bucketName, objectName } = parseObjectPath(
      `${privateObjectDir}${entityId}`,
    );
    const objectFile = objectStorageClient.bucket(bucketName).file(objectName);

    try {
      await objectFile.save(data, {
        resumable: false,
        validation: "crc32c",
        metadata: {
          contentType,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      await setObjectAclPolicy(objectFile, {
        owner,
        visibility: "public",
      });
      return `/objects/${entityId}`;
    } catch (error) {
      await objectFile.delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }
  }

  private getObjectEntityFileReference(objectPath: string): File {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    return bucket.file(objectName);
  }

  // Gets an existing object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    const objectFile = this.getObjectEntityFileReference(objectPath);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  // Derivatives are deliberately addressed by a hash, rather than user input,
  // and remain in this project's object-storage namespace.
  async getOptimizedImageFile(
    sourcePath: string,
    width: number,
    sourceVersion: string,
  ): Promise<File | null> {
    const derivative = this.getOptimizedImageDerivativeFile(
      sourcePath,
      width,
      sourceVersion,
    );
    const [exists] = await derivative.exists();
    return exists ? derivative : null;
  }

  async saveOptimizedImage(
    sourcePath: string,
    width: number,
    sourceVersion: string,
    data: Buffer,
  ): Promise<void> {
    const derivative = this.getOptimizedImageDerivativeFile(
      sourcePath,
      width,
      sourceVersion,
    );
    try {
      await derivative.save(data, {
        resumable: false,
        validation: "crc32c",
        metadata: {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      await setObjectAclPolicy(derivative, {
        owner: "optimized-images",
        visibility: "public",
      });
    } catch (error) {
      await derivative.delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }
  }

  async downloadOptimizedImage(file: File, res: Response): Promise<void> {
    const [metadata] = await file.getMetadata();
    res.set({
      "Content-Type": "image/webp",
      "Content-Length": metadata.size,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    file.createReadStream()
      .on("error", (error) => {
        console.error("Optimized image stream failed:", error);
        if (!res.headersSent) res.status(404).end();
        else res.destroy();
      })
      .pipe(res);
  }

  private getOptimizedImageDerivativeFile(
    sourcePath: string,
    width: number,
    sourceVersion: string,
  ): File {
    const sourceHash = createHash("sha256")
      .update(`${sourcePath}:${sourceVersion}`)
      .digest("hex");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir += "/";
    const { bucketName, objectName } = parseObjectPath(
      `${entityDir}optimized-images/${sourceHash}/${width}.webp`,
    );
    return objectStorageClient.bucket(bucketName).file(objectName);
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    try {
      const uploadEndpoint = new URL(rawPath, "https://upload.invalid");
      const match = uploadEndpoint.pathname.match(
        /^\/api\/objects\/upload\/(image|audio)\/([0-9]{10}\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43})$/,
      );
      if (match) {
        return `/objects/${OWNED_UPLOAD_PREFIX}/${match[1]}/${match[2]}`;
      }
    } catch {
      return rawPath;
    }
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Promotes only a freshly issued upload belonging to this authenticated owner.
  async promoteOwnedUploadToPublic(
    rawPath: string,
    owner: string,
    purpose: OwnedUploadPurpose,
    constraints: OwnedUploadConstraints,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!isOwnedUploadObjectPath(normalizedPath, owner, purpose)) {
      throw new OwnedUploadValidationError();
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    const [metadata] = await objectFile.getMetadata();
    const size = Number(metadata.size);
    const contentType = String(metadata.contentType || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > constraints.maxBytes ||
      !constraints.allowedContentTypes.has(contentType)
    ) {
      throw new OwnedUploadValidationError();
    }
    await setObjectAclPolicy(objectFile, {
      owner,
      visibility: "public",
    });
    return normalizedPath;
  }

  // Deletes an object entity from storage.
  async deleteObjectEntity(objectPath: string): Promise<void> {
    try {
      // Normalize the path if it's a public URL
      const normalizedPath = objectPath.startsWith("/public-objects")
        ? objectPath.replace("/public-objects", "")
        : objectPath;

      // Don't try to delete external URLs or placeholder images
      if (
        !normalizedPath.startsWith("/") ||
        normalizedPath.includes("unsplash.com") ||
        normalizedPath.includes("http")
      ) {
        return;
      }

      let file: File;
      if (normalizedPath.startsWith("/objects/")) {
        file = await this.getObjectEntityFile(normalizedPath);
      } else {
        const { bucketName, objectName } = parseObjectPath(normalizedPath);
        file = objectStorageClient.bucket(bucketName).file(objectName);
      }
      
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log(`Deleted old image: ${normalizedPath}`);
      }
    } catch (error) {
      console.error("Error deleting object:", error);
      // Don't throw - we don't want to fail the update if delete fails
    }
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}
