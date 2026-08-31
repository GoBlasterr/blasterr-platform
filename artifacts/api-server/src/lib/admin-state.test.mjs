import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { shouldSeedDevelopmentState } from "./admin-seeding.ts";

const requireFromDbPackage = createRequire(
  new URL("../../../../lib/db/package.json", import.meta.url),
);
const { Pool } = requireFromDbPackage("pg");

test("development fixtures are never enabled for production or tests", () => {
  assert.equal(shouldSeedDevelopmentState("development"), true);
  assert.equal(shouldSeedDevelopmentState("production"), false);
  assert.equal(shouldSeedDevelopmentState("test"), false);
  assert.equal(shouldSeedDevelopmentState(undefined), false);
});

test("all durable admin tables are present after schema application", async () => {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  assert.ok(databaseUrl, "SUPABASE_DATABASE_URL or DATABASE_URL is required for the schema integration test");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { rows } = await pool.query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [[
        "admin_reports",
        "admin_audit_events",
        "admin_content_statuses",
        "admin_settings",
        "admin_feature_flags",
        "admin_announcements",
      ]],
    );
    assert.deepEqual(
      rows.map((row) => row.tablename).sort(),
      [
        "admin_announcements",
        "admin_audit_events",
        "admin_content_statuses",
        "admin_feature_flags",
        "admin_reports",
        "admin_settings",
      ],
    );
  } finally {
    await pool.end();
  }
});

test("moderation reports and their audit history persist in PostgreSQL", async () => {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  assert.ok(databaseUrl, "SUPABASE_DATABASE_URL or DATABASE_URL is required for the persistence integration test");
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const suffix = crypto.randomUUID();
  const reportId = `test-report-${suffix}`;
  const auditId = `test-audit-${suffix}`;

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO admin_reports
        (id, reporter_id, target_type, target_id, reason, description, status, note)
       VALUES ($1, $2, 'blast', $3, 'spam', $4, 'open', '')`,
      [reportId, `test-reporter-${suffix}`, `test-blast-${suffix}`, "Persistence boundary integration test."],
    );
    await client.query(
      "UPDATE admin_reports SET status = 'resolved', note = $1 WHERE id = $2",
      ["Verified by integration test.", reportId],
    );
    await client.query(
      `INSERT INTO admin_audit_events
        (id, action, entity_type, entity_id, actor_id, details)
       VALUES ($1, 'report_resolved', 'report', $2, $3, $4)`,
      [auditId, reportId, `test-admin-${suffix}`, "Verified by integration test."],
    );
    await client.query("COMMIT");

    const { rows: [storedReport] } = await client.query(
      "SELECT status, note FROM admin_reports WHERE id = $1",
      [reportId],
    );
    const { rows: [storedAudit] } = await client.query(
      "SELECT actor_id, entity_id, created_at FROM admin_audit_events WHERE id = $1",
      [auditId],
    );

    assert.equal(storedReport.status, "resolved");
    assert.equal(storedReport.note, "Verified by integration test.");
    assert.equal(storedAudit.actor_id, `test-admin-${suffix}`);
    assert.equal(storedAudit.entity_id, reportId);
    assert.ok(storedAudit.created_at instanceof Date);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.query("DELETE FROM admin_audit_events WHERE id = $1", [auditId]);
    await client.query("DELETE FROM admin_reports WHERE id = $1", [reportId]);
    client.release();
    await pool.end();
  }
});