import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, request } from "node:http";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import express from "express";
import { build } from "esbuild";
import { createProxyMiddleware } from "http-proxy-middleware";

const secret = "local-test-only-public-host-signing-secret";
const prior = {
  NODE_ENV: process.env.NODE_ENV,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  BLASTERR_PROXY_HOST_SIGNING_SECRET: process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET,
};
process.env.NODE_ENV = "production";
process.env.CLERK_SECRET_KEY = "local-test-only-clerk-key";
process.env.BLASTERR_PROXY_HOST_SIGNING_SECRET = secret;

after(() => {
  for (const [key, value] of Object.entries(prior)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function signedHeaders() {
  const timestamp = String(Date.now());
  return {
    "x-blasterr-public-host": "goblasterr.com",
    "x-blasterr-public-host-timestamp": timestamp,
    "x-blasterr-public-host-signature": createHmac("sha256", secret)
      .update(`goblasterr.com\n${timestamp}`).digest("hex"),
  };
}

test("signed public Host and original Origin reach Clerk without private headers", async () => {
  const received = [];
  const upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"clerk":"ok"}');
  });
  const upstreamPort = await listen(upstream);
  let proxyOptions;
  globalThis.__clerkProxyHostTestFactory = (options) => {
    proxyOptions = options;
    return createProxyMiddleware({ ...options, target: `http://127.0.0.1:${upstreamPort}` });
  };
  let server;
  try {
    // Substitute only the network target; run the real proxy and its real hooks.
    const output = await build({
      entryPoints: [fileURLToPath(new URL("../middlewares/clerkProxyMiddleware.ts", import.meta.url))],
      bundle: true,
      platform: "node",
      format: "esm",
      packages: "external",
      write: false,
      plugins: [{
        name: "local-clerk-upstream",
        setup(plugin) {
          plugin.onResolve({ filter: /^http-proxy-middleware$/ }, () => ({
            path: "local-clerk-upstream", namespace: "test",
          }));
          plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents: "export const createProxyMiddleware = (options) => globalThis.__clerkProxyHostTestFactory(options);",
            loader: "js",
          }));
        },
      }],
    });
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`;
    const { CLERK_PROXY_PATH, clerkProxyMiddleware, validatePublicHostHeader } = await import(moduleUrl);
    const app = express();
    app.use("/api", validatePublicHostHeader());
    app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
    app.get("/api/healthz", (_req, res) => res.sendStatus(200));
    server = createServer(app);
    const port = await listen(server);
    const url = `http://127.0.0.1:${port}`;

    const headers = {
      ...signedHeaders(),
      host: "blasterr-admin.replit.app",
      origin: "https://goblasterr.com",
      cookie: "session=opaque",
      authorization: "Bearer opaque-test-value",
    };
    const environment = await fetch(`${url}/api/__clerk/v1/environment`, { headers });
    assert.equal(environment.status, 200);
    assert.deepEqual(await environment.json(), { clerk: "ok" });
    const body = '{"test":"unchanged"}';
    const signIn = await fetch(`${url}/api/__clerk/v1/client/sign_ins?source=browser`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body,
    });
    assert.equal(signIn.status, 200);
    assert.equal(proxyOptions.target, "https://frontend-api.clerk.dev");
    assert.equal(proxyOptions.changeOrigin, true);
    assert.deepEqual(received.map(({ method, url: path }) => [method, path]), [
      ["GET", "/v1/environment"],
      ["POST", "/v1/client/sign_ins?source=browser"],
    ]);
    for (const { headers: forwarded } of received) {
      assert.equal(forwarded.host, "goblasterr.com");
      assert.equal(forwarded.origin, "https://goblasterr.com");
      assert.equal(forwarded.cookie, "session=opaque");
      assert.equal(forwarded.authorization, "Bearer opaque-test-value");
      assert.equal(forwarded["clerk-proxy-url"], "https://goblasterr.com/api/__clerk");
      for (const name of Object.keys(signedHeaders())) {
        assert.equal(forwarded[name], undefined);
      }
    }
    assert.equal(received[1].body, body);
    assert.equal(received[1].headers["content-type"], "application/json");
    assert.equal((await fetch(`${url}/api/healthz`, { headers })).status, 200);
    assert.equal((await fetch(`${url}/api/healthz`, {
      headers: { ...headers, "x-blasterr-public-host-signature": "0".repeat(64) },
    })).status, 400);

    const directStatus = await new Promise((resolve, reject) => {
      const direct = request(`${url}/api/__clerk/v1/environment`, {
        headers: { host: "blasterr-admin.replit.app" },
      }, (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      });
      direct.on("error", reject);
      direct.end();
    });
    assert.equal(directStatus, 200);
    assert.equal(received.at(-1).headers.host, `127.0.0.1:${upstreamPort}`);
  } finally {
    if (server) await close(server);
    await close(upstream);
    delete globalThis.__clerkProxyHostTestFactory;
  }
});