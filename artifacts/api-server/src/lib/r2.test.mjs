import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMediaObjectKey,
  keyFromObjectPath,
  objectPathForKey,
  publicUrlForKey,
  validateR2Configuration,
} from "./r2.ts";

const validEnv = {
  CLOUDFLARE_R2_ACCOUNT_ID: "account",
  CLOUDFLARE_R2_BUCKET: "media",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "access",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret",
  CLOUDFLARE_R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  CLOUDFLARE_R2_PUBLIC_URL: "https://media.example.com",
};

test("validates a server-only R2 configuration", () => {
  const config = validateR2Configuration(validEnv);
  assert.equal(config.bucket, "media");
  assert.equal(config.endpoint, "https://account.r2.cloudflarestorage.com");
});

test("rejects incomplete and insecure R2 configuration", () => {
  assert.throws(() => validateR2Configuration({}), /required/);
  assert.throws(
    () => validateR2Configuration({ ...validEnv, CLOUDFLARE_R2_ENDPOINT: "http://localhost" }),
    /HTTPS/,
  );
});

test("generates purpose-scoped immutable object keys", () => {
  const key = buildMediaObjectKey({
    ownerId: "user/unsafe",
    purpose: "blast-media",
    contentType: "image/png",
  });
  assert.match(key, /^users\/user_unsafe\/blast-media\/[0-9a-f-]+\.png$/);
  assert.equal(keyFromObjectPath(`/api/storage${objectPathForKey(key)}`), key);
  assert.equal(keyFromObjectPath("/api/storage/objects/../secret"), null);
});

test("resolves configured public delivery URLs without exposing credentials", () => {
  assert.equal(
    publicUrlForKey("users/a/image file.png", validEnv),
    "https://media.example.com/users/a/image%20file.png",
  );
});