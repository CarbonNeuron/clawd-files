import { describe, it, expect, beforeAll } from "vitest";
import { createHash } from "crypto";

process.env.DATA_DIR = "/tmp/clawd-test-auth-" + Date.now() + "-" + Math.random().toString(36).slice(2);
process.env.ADMIN_API_KEY = "test-admin-key";

import {
  authenticate,
  generateDashboardToken,
  verifyDashboardToken,
} from "../auth";
import { db } from "../db";
import { apiKeys, buckets, files } from "../schema";

function makeRequest(bearer?: string): Request {
  const headers = new Headers();
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  return new Request("http://localhost/api/test", { headers });
}

describe("authenticate", () => {
  beforeAll(() => {
    // Clean up any existing data
    db.delete(files).run();
    db.delete(buckets).run();
    db.delete(apiKeys).run();
  });

  it("returns admin for ADMIN_API_KEY", async () => {
    const result = await authenticate(makeRequest("test-admin-key"));
    expect(result).toEqual({ type: "admin" });
  });

  it("throws for missing auth header", async () => {
    await expect(authenticate(makeRequest())).rejects.toThrow();
  });

  it("returns key info for valid LLM key", async () => {
    const rawKey = "llm-test-key-12345678";
    const hash = createHash("sha256").update(rawKey).digest("hex");
    const now = Math.floor(Date.now() / 1000);

    db.insert(apiKeys)
      .values({
        key: hash,
        prefix: rawKey.slice(0, 8),
        name: "Test LLM",
        createdAt: now,
        lastUsedAt: now,
      })
      .run();

    const result = await authenticate(makeRequest(rawKey));
    expect(result).toEqual({ type: "key", keyHash: hash, name: "Test LLM" });
  });

  it("throws for unknown key", async () => {
    await expect(authenticate(makeRequest("unknown-key"))).rejects.toThrow();
  });
});

describe("dashboard tokens", () => {
  it("generates and verifies a valid token", () => {
    const token = generateDashboardToken();
    expect(verifyDashboardToken(token)).toBe(true);
  });

  it("rejects tampered token", () => {
    expect(verifyDashboardToken("tampered.token")).toBe(false);
  });

  it("rejects expired token", () => {
    const token = generateDashboardToken(-1);
    expect(verifyDashboardToken(token)).toBe(false);
  });
});
