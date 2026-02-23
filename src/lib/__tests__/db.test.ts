import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";

process.env.DATA_DIR = "/tmp/clawd-test-db-" + Date.now() + "-" + Math.random().toString(36).slice(2);

import { db } from "../db";
import { apiKeys, buckets, files } from "../schema";

describe("database", () => {
  beforeAll(() => {
    // Clean up any existing data
    db.delete(files).run();
    db.delete(buckets).run();
    db.delete(apiKeys).run();
  });

  it("can insert and query an api key", () => {
    db.insert(apiKeys)
      .values({
        key: "test-hash-db",
        prefix: "test1234",
        name: "Test Key",
        createdAt: Math.floor(Date.now() / 1000),
        lastUsedAt: Math.floor(Date.now() / 1000),
      })
      .run();

    const rows = db.select().from(apiKeys).where(eq(apiKeys.key, "test-hash-db")).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Test Key");
  });

  it("cascade deletes files when bucket is deleted", () => {
    const now = Math.floor(Date.now() / 1000);
    db.insert(buckets)
      .values({
        id: "test-bkt-01",
        name: "Test Bucket",
        keyHash: "test-hash-db",
        owner: "Test Key",
        createdAt: now,
      })
      .run();

    db.insert(files)
      .values({
        bucketId: "test-bkt-01",
        path: "hello.txt",
        size: 5,
        mimeType: "text/plain",
        createdAt: now,
      })
      .run();

    db.delete(buckets).where(eq(buckets.id, "test-bkt-01")).run();

    const remainingFiles = db.select().from(files).where(eq(files.bucketId, "test-bkt-01")).all();
    expect(remainingFiles).toHaveLength(0);
  });
});
