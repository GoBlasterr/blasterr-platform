import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const MAX_SIGNED_URL_SECONDS = 15 * 60;
const R2_PROVIDER = "cloudflare-r2";

export type R2Config = {
  accountId: string;
  bucket: string;
  endpoint: string;
  publicUrl?: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type R2Health = {
  provider: typeof R2_PROVIDER;
  configured: boolean;
  status: "operational" | "unavailable";
  detail: string;
};

let client: S3Client | null = null;
let clientConfigKey = "";
const objectExistenceCache = new Map<string, number>();
const objectExistenceRequests = new Map<string, Promise<void>>();

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`${name} is required for Cloudflare R2.`);
  return value.trim();
}

export function getR2Config(env: NodeJS.ProcessEnv = process.env): R2Config {
  const accountId = required("CLOUDFLARE_R2_ACCOUNT_ID", env.CLOUDFLARE_R2_ACCOUNT_ID);
  const bucket = required("CLOUDFLARE_R2_BUCKET", env.CLOUDFLARE_R2_BUCKET);
  const accessKeyId = required("CLOUDFLARE_R2_ACCESS_KEY_ID", env.CLOUDFLARE_R2_ACCESS_KEY_ID);
  const secretAccessKey = required("CLOUDFLARE_R2_SECRET_ACCESS_KEY", env.CLOUDFLARE_R2_SECRET_ACCESS_KEY);
  const endpoint = required("CLOUDFLARE_R2_ENDPOINT", env.CLOUDFLARE_R2_ENDPOINT);
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error("CLOUDFLARE_R2_ENDPOINT must be a valid HTTPS URL.");
  }
  if (endpointUrl.protocol !== "https:") {
    throw new Error("CLOUDFLARE_R2_ENDPOINT must use HTTPS.");
  }

  const publicUrl = env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || undefined;
  if (publicUrl) {
    let publicUrlValue: URL;
    try {
      publicUrlValue = new URL(publicUrl);
    } catch {
      throw new Error("CLOUDFLARE_R2_PUBLIC_URL must be a valid HTTP(S) URL.");
    }
    if (!["http:", "https:"].includes(publicUrlValue.protocol)) {
      throw new Error("CLOUDFLARE_R2_PUBLIC_URL must use HTTP or HTTPS.");
    }
  }

  return { accountId, bucket, endpoint: endpointUrl.toString().replace(/\/$/, ""), publicUrl, accessKeyId, secretAccessKey };
}

export function validateR2Configuration(env: NodeJS.ProcessEnv = process.env): R2Config {
  return getR2Config(env);
}

export function getR2Client(): S3Client {
  const config = getR2Config();
  const nextKey = `${config.endpoint}:${config.bucket}:${config.accessKeyId}`;
  if (!client || clientConfigKey !== nextKey) {
    client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    clientConfigKey = nextKey;
  }
  return client;
}

export function buildMediaObjectKey(input: {
  ownerId: string;
  purpose: string;
  contentType: string;
}): string {
  const safeOwner = input.ownerId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const safePurpose = input.purpose.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const extension = input.contentType.split("/")[1]?.split("+")[0]?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  return `users/${safeOwner}/${safePurpose}/${randomUUID()}.${extension}`;
}

export function objectPathForKey(key: string): string {
  return `/objects/${key}`;
}

export function publicUrlForKey(key: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const base = getR2Config(env).publicUrl;
  return base ? `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}` : undefined;
}

export async function presignUpload(input: {
  key: string;
  contentType?: string;
  expiresIn?: number;
}): Promise<string> {
  const config = getR2Config();
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      ...(input.contentType ? { ContentType: input.contentType } : {}),
    }),
    { expiresIn: Math.min(input.expiresIn ?? MAX_SIGNED_URL_SECONDS, MAX_SIGNED_URL_SECONDS) },
  );
}

export async function presignDownload(input: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const config = getR2Config();
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: config.bucket, Key: input.key }),
    { expiresIn: Math.min(input.expiresIn ?? MAX_SIGNED_URL_SECONDS, MAX_SIGNED_URL_SECONDS) },
  );
}

export async function deleteR2Object(key: string): Promise<void> {
  const config = getR2Config();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function headR2Object(key: string): Promise<void> {
  const config = getR2Config();
  await getR2Client().send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function confirmR2ObjectExists(key: string): Promise<void> {
  const expiresAt = objectExistenceCache.get(key);
  if (expiresAt && expiresAt > Date.now()) return;
  const pending = objectExistenceRequests.get(key);
  if (pending) return pending;
  const request = headR2Object(key);
  objectExistenceRequests.set(key, request);
  try {
    await request;
    objectExistenceCache.set(key, Date.now() + 5 * 60 * 1000);
  } finally {
    objectExistenceRequests.delete(key);
  }
}

export async function uploadFileToR2(input: {
  path: string;
  key: string;
  contentType: string;
}): Promise<void> {
  const config = getR2Config();
  await getR2Client().send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    ContentType: input.contentType,
    Body: await readFile(input.path),
  }));
}

export async function uploadBytesToR2(input: {
  body: Buffer;
  key: string;
  contentType: string;
}): Promise<void> {
  const config = getR2Config();
  await getR2Client().send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    ContentType: input.contentType,
    Body: input.body,
  }));
}

export async function checkR2Connection(): Promise<R2Health> {
  try {
    const config = getR2Config();
    await getR2Client().send(new HeadBucketCommand({ Bucket: config.bucket }));
    return { provider: R2_PROVIDER, configured: true, status: "operational", detail: "Cloudflare R2 bucket is reachable." };
  } catch (error) {
    const detail = error instanceof Error && error.message.includes("required")
      ? error.message
      : "Cloudflare R2 is configured but the bucket could not be reached.";
    return { provider: R2_PROVIDER, configured: false, status: "unavailable", detail };
  }
}

export function isR2ObjectPath(value: string): boolean {
  return value.startsWith("/api/storage/objects/") || value.startsWith("/objects/");
}

export function keyFromObjectPath(value: string): string | null {
  if (!isR2ObjectPath(value)) return null;
  const path = value.replace(/^\/api\/storage\/objects\//, "").replace(/^\/objects\//, "");
  if (!path || path.includes("..") || path.startsWith("/") || path.includes("\\")) return null;
  return path;
}