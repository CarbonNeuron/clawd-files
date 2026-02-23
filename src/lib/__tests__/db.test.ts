import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";

process.env.DATA_DIR = "/tmp/clawd-test-" + Date.now();

import { db } from "../db";
import { apiKeys, buckets, files } from "../schema";

describe("database", () => {
  it("can insert and query an api key", () => {
    db.insert(apiKeys)
      .values({
        key: "test-hash",
        prefix: "test1234",
        name: "Test Key",
        createdAt: Math.floor(Date.now() / 1000),
        lastUsedAt: Math.floor(Date.now() / 1000),
      })
      .run();

    const rows = db.select().from(apiKeys).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Test Key");
  });

  it("cascade deletes files when bucket is deleted", () => {
    const now = Math.floor(Date.now() / 1000);
    db.insert(buckets)
      .values({
        id: "test-bkt-01",
        name: "Test Bucket",
        keyHash: "test-hash",
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

    const remainingFiles = db.select().from(files).all();
    expect(remainingFiles).toHaveLength(0);
  });
});
