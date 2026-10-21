import assert from "node:assert/strict";
import {
  createOptimizedImageVersion,
  parseOptimizedImagePath,
  parseVersionedOptimizedImagePath,
} from "./optimizedImages";
import { getOptimizedImageUrl } from "../client/src/components/OptimizedImage";

// This intentionally has no storage dependency; run with npm run test:optimized-images.
(globalThis as { window: Pick<Window, "location"> }).window = {
  location: { origin: "https://app.example.test" } as Location,
};

assert.deepEqual(
  parseOptimizedImagePath("800", "objects/article-imports/photo.jpg"),
  { width: 800, sourcePath: "/objects/article-imports/photo.jpg" },
);
assert.deepEqual(
  parseOptimizedImagePath("200", "objects/article-imports/photo.jpg"),
  { width: 200, sourcePath: "/objects/article-imports/photo.jpg" },
);
assert.deepEqual(
  parseOptimizedImagePath("720", "objects/article-imports/photo.jpg"),
  { width: 720, sourcePath: "/objects/article-imports/photo.jpg" },
);
assert.equal(parseOptimizedImagePath("801", "objects/photo.jpg"), null);
assert.equal(parseOptimizedImagePath("800", "../objects/photo.jpg"), null);
assert.equal(parseOptimizedImagePath("800", "objects/%2e%2e/private.jpg"), null);
assert.equal(parseOptimizedImagePath("800", "https://example.test/photo.jpg"), null);
const version = createOptimizedImageVersion(
  "/objects/article-imports/photo.jpg",
  "1700000000000000",
);
assert.match(version, /^[a-f0-9]{64}$/);
assert.notEqual(
  version,
  createOptimizedImageVersion("/objects/article-imports/photo.jpg", "1700000000000001"),
);
assert.deepEqual(
  parseVersionedOptimizedImagePath("800", version, "objects/article-imports/photo.jpg"),
  { width: 800, version, sourcePath: "/objects/article-imports/photo.jpg" },
);
assert.equal(
  parseVersionedOptimizedImagePath("800", "not-a-version", "objects/article-imports/photo.jpg"),
  null,
);
assert.equal(
  createOptimizedImageVersion("/objects/article-imports/photo.jpg", "changed-generation") === version,
  false,
);
assert.equal(
  getOptimizedImageUrl("/public-objects/objects/article-imports/photo.jpg", 800),
  "/optimized-images/800/objects/article-imports/photo.jpg",
);
assert.equal(
  getOptimizedImageUrl("https://images.unsplash.com/photo.jpg", 800),
  null,
);
assert.equal(getOptimizedImageUrl("/public-objects/other/photo.jpg", 800), null);
assert.equal(
  getOptimizedImageUrl("/public-objects/objects/%2f/private.jpg", 800),
  null,
);
assert.equal(
  getOptimizedImageUrl("/public-objects/objects/%5c/private.jpg", 800),
  null,
);

console.log("optimized image path validation passed");