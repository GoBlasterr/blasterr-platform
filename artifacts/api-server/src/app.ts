import express, { type Express } from "express";
import cors from "cors";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { adminSettings, ensureAdminState } from "./lib/admin-state";
import { isSuspended } from "./lib/admin-auth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api/") || req.path === "/api/healthz" || req.path.startsWith("/api/admin/")) {
    next();
    return;
  }
  try {
    await ensureAdminState();
  } catch (error) {
    req.log.error({ err: error }, "Unable to load persisted platform state");
    res.status(503).json({ error: "BLASTERR is temporarily unavailable." });
    return;
  }
  if (adminSettings.maintenanceMode) {
    res.status(503).json({ error: "BLASTERR is temporarily in maintenance mode." });
    return;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const { userId } = getAuth(req);
    if (userId) {
      try {
        const user = await clerkClient.users.getUser(userId);
        if (isSuspended(user.publicMetadata as Record<string, unknown>)) {
          res.status(403).json({ error: "This account is suspended." });
          return;
        }
      } catch (error) {
        req.log.warn({ err: error, userId }, "Unable to verify account status");
        res.status(401).json({ error: "Unable to verify account." });
        return;
      }
    }
  }
  next();
});

app.use("/api", router);

export default app;
