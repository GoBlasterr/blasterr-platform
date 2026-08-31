import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";

type CmsEvent = { type: "cms.updated"; entryType?: string; id?: string; at: string };
type Listener = (event: CmsEvent) => void;
const listeners = new Set<Listener>();
const instanceId = randomUUID();
let listenerStarted = false;

function dispatch(event: CmsEvent) {
  for (const listener of listeners) listener(event);
}

async function startDatabaseListener() {
  if (listenerStarted) return;
  listenerStarted = true;
  try {
    const client = await pool.connect();
    await client.query("listen blasterr_cms_updates");
    client.on("notification", (message) => {
      try {
        const payload = JSON.parse(message.payload ?? "{}") as CmsEvent & { source?: string };
        if (payload.source !== instanceId && payload.type === "cms.updated") dispatch(payload);
      } catch { /* ignore malformed database notifications */ }
    });
    client.on("error", () => { listenerStarted = false; client.release(true); });
  } catch {
    listenerStarted = false;
  }
}

export function emitCmsEvent(event: Omit<CmsEvent, "at">) {
  const message = { ...event, at: new Date().toISOString() };
  dispatch(message);
  void pool.query("select pg_notify('blasterr_cms_updates', $1)", [JSON.stringify({ ...message, source: instanceId })]).catch(() => undefined);
}

export function subscribeCmsEvents(listener: Listener) {
  listeners.add(listener);
  void startDatabaseListener();
  return () => listeners.delete(listener);
}