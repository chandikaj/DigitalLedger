import assert from "node:assert/strict";
import {
  createOwnedUploadObjectPath,
  isOwnedUploadObjectPath,
} from "./objectStorage";

const secret = "fixed-test-secret";
const owner = "11111111-1111-4111-8111-111111111111";
const otherOwner = "22222222-2222-4222-8222-222222222222";
const objectId = "33333333-3333-4333-8333-333333333333";
const expiresAt = 2_000_000_000_000;

const path = createOwnedUploadObjectPath(
  owner,
  "image",
  objectId,
  secret,
  expiresAt,
);
assert.match(
  path,
  /^\/objects\/uploads\/v3\/image\/2000000000\.33333333-3333-4333-8333-333333333333\.[A-Za-z0-9_-]{43}$/,
);
assert.equal(
  isOwnedUploadObjectPath(path, owner, "image", secret, expiresAt - 1),
  true,
);
assert.equal(
  isOwnedUploadObjectPath(path, owner, "image", secret, expiresAt + 1),
  false,
);
assert.equal(
  isOwnedUploadObjectPath(path, owner, "audio", secret, expiresAt - 1),
  false,
);
assert.equal(
  isOwnedUploadObjectPath(
    path,
    otherOwner,
    "image",
    secret,
    expiresAt - 1,
  ),
  false,
);
assert.equal(
  isOwnedUploadObjectPath(
    path.replace(objectId, otherOwner),
    owner,
    "image",
    secret,
    expiresAt - 1,
  ),
  false,
);
assert.equal(
  isOwnedUploadObjectPath(
    `${path}/extra`,
    owner,
    "image",
    secret,
    expiresAt - 1,
  ),
  false,
);
assert.equal(
  isOwnedUploadObjectPath(
    "/objects/uploads/legacy-id",
    owner,
    "image",
    secret,
    expiresAt - 1,
  ),
  false,
);

console.log("owned upload path validation passed");