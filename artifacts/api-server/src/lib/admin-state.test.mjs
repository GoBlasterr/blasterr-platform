import assert from "node:assert/strict";
import test from "node:test";
import { getTableName } from "drizzle-orm";
import {
  developmentAdvertisingFixtures,
  seedDevelopmentAdvertising,
  shouldSeedDevelopmentState,
} from "./admin-seeding.ts";

test("development fixtures are never enabled for production or tests", () => {
  assert.equal(shouldSeedDevelopmentState("development"), true);
  assert.equal(shouldSeedDevelopmentState("production"), false);
  assert.equal(shouldSeedDevelopmentState("test"), false);
  assert.equal(shouldSeedDevelopmentState(undefined), false);
});

function createRecordingDatabase() {
  const inserts = [];
  let transactions = 0;
  const transaction = async (callback) => {
    transactions += 1;
    return callback({
      insert(table) {
        return {
          values(value) {
            inserts.push({ table: getTableName(table), value });
            return {
              async onConflictDoNothing() {},
            };
          },
        };
      },
    });
  };
  return {
    database: { transaction },
    inserts,
    transactionCount: () => transactions,
  };
}

test("advertising fixtures seed only in development and stay delivery-only", async () => {
  for (const nodeEnv of ["production", "test"]) {
    const recording = createRecordingDatabase();
    await seedDevelopmentAdvertising(nodeEnv, recording.database);
    assert.equal(recording.transactionCount(), 0);
    assert.deepEqual(recording.inserts, []);
  }

  const recording = createRecordingDatabase();
  await seedDevelopmentAdvertising("development", recording.database);

  assert.equal(recording.transactionCount(), 1);
  assert.deepEqual(
    recording.inserts.map(({ table }) => table),
    [
      "advertisers",
      "ad_campaigns",
      "advertisements",
      "ad_approval_records",
    ],
  );
  assert.deepEqual(
    recording.inserts.map(({ value }) => value),
    [
      developmentAdvertisingFixtures.advertiser,
      developmentAdvertisingFixtures.campaign,
      developmentAdvertisingFixtures.advertisement,
      developmentAdvertisingFixtures.approval,
    ],
  );

  const { advertiser, campaign, advertisement, approval } =
    developmentAdvertisingFixtures;
  assert.equal(advertiser.status, "active");
  assert.equal(campaign.status, "active");
  assert.ok(campaign.placements.includes("right_rail"));
  assert.deepEqual(campaign.targeting, {});
  assert.ok(campaign.startsAt <= new Date());
  assert.equal(campaign.endsAt, null);
  assert.equal(campaign.dailyBudget, null);
  assert.equal(campaign.totalBudget, null);
  assert.equal(advertisement.status, "active");
  assert.equal(advertisement.placement, "right_rail");
  assert.deepEqual(advertisement.targeting, {});
  assert.equal(advertisement.frequencyCap, null);
  assert.equal(approval.action, "approve");
});

test("all durable admin tables are present after schema application", {
  skip: process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true",
}, async () => {
  const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;
  const useSupabaseDatabase = process.env.USE_SUPABASE_DATABASE === "true";
  const validSupabaseDatabaseUrl =
    supabaseDatabaseUrl && /^postgres(?:ql)?:\/\//i.test(supabaseDatabaseUrl)
      ? supabaseDatabaseUrl
      : undefined;
  const databaseUrl =
    useSupabaseDatabase
      ? validSupabaseDatabaseUrl
      : process.env.DATABASE_URL ?? validSupabaseDatabaseUrl;
  assert.ok(databaseUrl, "SUPABASE_DATABASE_URL or DATABASE_URL is required for the schema integration test");
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
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

test("moderation reports and their audit history persist in PostgreSQL", {
  skip: process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true",
}, async () => {
  const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;
  const useSupabaseDatabase = process.env.USE_SUPABASE_DATABASE === "true";
  const validSupabaseDatabaseUrl =
    supabaseDatabaseUrl && /^postgres(?:ql)?:\/\//i.test(supabaseDatabaseUrl)
      ? supabaseDatabaseUrl
      : undefined;
  const databaseUrl =
    useSupabaseDatabase
      ? validSupabaseDatabaseUrl
      : process.env.DATABASE_URL ?? validSupabaseDatabaseUrl;
  assert.ok(databaseUrl, "SUPABASE_DATABASE_URL or DATABASE_URL is required for the persistence integration test");
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
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