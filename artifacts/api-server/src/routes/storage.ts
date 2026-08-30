import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const signedGetUrlCache = new Map<string, { url: string; expiresAt: number }>();
const signedGetUrlRequests = new Map<string, Promise<string>>();

function getPrivateObjectPath(): { bucketName: string; prefix: string } {
  const rawPath = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!rawPath) {
    throw new Error("PRIVATE_OBJECT_DIR is not configured");
  }

  const [bucketName, ...prefixParts] = rawPath.split("/");
  if (!bucketName) {
    throw new Error("PRIVATE_OBJECT_DIR is invalid");
  }

  return { bucketName, prefix: prefixParts.join("/") };
}

async function getSignedObjectUrl({
  bucketName,
  objectName,
  method,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT";
}): Promise<string> {
  const cacheKey = `${bucketName}/${objectName}`;
  if (method === "GET") {
    const cached = signedGetUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    const pending = signedGetUrlRequests.get(cacheKey);
    if (pending) {
      return pending;
    }
  }

  const request = (async () => {
    const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign object URL: ${response.status}`);
    }

    const payload = await response.json() as { signed_url?: string };
    if (!payload.signed_url) {
      throw new Error("Object storage returned no signed URL");
    }

    if (method === "GET") {
      signedGetUrlCache.set(cacheKey, {
        url: payload.signed_url,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    }

    return payload.signed_url;
  })();

  if (method === "GET") {
    signedGetUrlRequests.set(cacheKey, request);
  }

  try {
    return await request;
  } finally {
    if (method === "GET") {
      signedGetUrlRequests.delete(cacheKey);
    }
  }
}

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const { userId: authenticatedUserId } = getAuth(req);
  const userId = authenticatedUserId ?? (
    process.env.NODE_ENV === "development" ? "demo-preview-user" : null
  );
  if (!userId) {
    res.status(401).json({ error: "Sign in is required before uploading files." });
    return;
  }

  const { name, size, contentType, purpose } = req.body ?? {};
  const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const uploadPurpose = purpose === "avatar" || purpose === "banner" ? purpose : "general";

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof size !== "number" ||
    size <= 0 ||
    size > 10 * 1024 * 1024 ||
    typeof contentType !== "string" ||
    !allowedImageTypes.has(contentType)
  ) {
    res.status(400).json({ error: "Upload an image up to 10 MB." });
    return;
  }

  try {
    const { bucketName, prefix } = getPrivateObjectPath();
    const objectId = randomUUID();
    const objectName = [prefix, "users", userId, uploadPurpose, objectId].filter(Boolean).join("/");
    const uploadURL = await getSignedObjectUrl({
      bucketName,
      objectName,
      method: "PUT",
    });

    res.json({
      uploadURL,
      objectPath: `/objects/users/${userId}/${uploadPurpose}/${objectId}`,
      metadata: { name: name.trim(), size, contentType },
    });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "File storage is unavailable right now." });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const wildcardPath = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path;
    if (!wildcardPath || wildcardPath.includes("..")) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const { bucketName, prefix } = getPrivateObjectPath();
    const objectName = [prefix, wildcardPath].filter(Boolean).join("/");
    const signedURL = await getSignedObjectUrl({
      bucketName,
      objectName,
      method: "GET",
    });

    res.set("Cache-Control", "public, max-age=600, immutable");
    res.redirect(signedURL);
  } catch (error) {
    req.log.error({ err: error }, "Error serving object");
    res.status(404).json({ error: "Object not found" });
  }
});

export default router;