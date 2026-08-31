import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("migration tooling uses versioned migrations and never schema push", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };

  assert.match(packageJson.scripts.generate, /drizzle-kit generate/);
  assert.match(packageJson.scripts.migrate, /drizzle-kit migrate/);
  assert.match(packageJson.scripts["check:migrations"], /drizzle-kit check/);
  assert.equal(
    Object.values(packageJson.scripts).some((command) => command.includes("drizzle-kit push")),
    false,
  );
});