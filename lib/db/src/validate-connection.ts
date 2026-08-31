let closePool: (() => Promise<void>) | undefined;

try {
  const { pool, validateDatabaseConnection } = await import("./index");
  closePool = () => pool.end();
  await validateDatabaseConnection();
  console.log("Supabase database connection validated.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Unable to validate Supabase database connection.",
  );
  process.exitCode = 1;
} finally {
  await closePool?.();
}

export {};