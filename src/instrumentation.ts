export async function register() {
  if (typeof window !== "undefined") return;

  const { db } = await import("./lib/db");
  const { buckets } = await import("./lib/schema");
  const { deleteBucket } = await import("./lib/storage");
  const { eq, lt, isNotNull, and } = await import("drizzle-orm");

  async function cleanup() {
    const now = Math.floor(Date.now() / 1000);

    const expired = db
      .select({ id: buckets.id })
      .from(buckets)
      .where(and(isNotNull(buckets.expiresAt), lt(buckets.expiresAt, now)))
      .all();

    for (const bucket of expired) {
      await deleteBucket(bucket.id);
      db.delete(buckets).where(eq(buckets.id, bucket.id)).run();
    }

    if (expired.length > 0) {
      console.log(`[cleanup] Deleted ${expired.length} expired bucket(s).`);
    }
  }

  // Run cleanup once on startup
  await cleanup();

  // Run cleanup every 15 minutes
  setInterval(cleanup, 15 * 60 * 1000);
}
