import { describe, it, expect, afterAll } from "vitest";
import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";

const TEST_DIR = "/tmp/clawd-test-storage-" + Date.now();
process.env.DATA_DIR = TEST_DIR;

import {
  saveFile,
  deleteFile,
  deleteBucket,
  getFilePath,
  getDataDir,
} from "../storage";

describe("storage", () => {
  it("saves a file to the correct path", async () => {
    await saveFile("bucket1", "hello.txt", Buffer.from("hello world"));
    const filePath = getFilePath("bucket1", "hello.txt");
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, "utf-8")).toBe("hello world");
  });

  it("saves nested paths creating intermediate directories", async () => {
    await saveFile("bucket1", "reports/q1/data.csv", Buffer.from("a,b,c"));
    const filePath = getFilePath("bucket1", "reports/q1/data.csv");
    expect(existsSync(filePath)).toBe(true);
  });

  it("replaces file at existing path", async () => {
    await saveFile("bucket2", "file.txt", Buffer.from("v1"));
    await saveFile("bucket2", "file.txt", Buffer.from("v2"));
    const filePath = getFilePath("bucket2", "file.txt");
    expect(readFileSync(filePath, "utf-8")).toBe("v2");
  });

  it("deletes a single file", async () => {
    await saveFile("bucket3", "delete-me.txt", Buffer.from("bye"));
    const filePath = getFilePath("bucket3", "delete-me.txt");
    expect(existsSync(filePath)).toBe(true);
    await deleteFile("bucket3", "delete-me.txt");
    expect(existsSync(filePath)).toBe(false);
  });

  it("deletes entire bucket directory", async () => {
    await saveFile("bucket4", "a.txt", Buffer.from("a"));
    await saveFile("bucket4", "b/c.txt", Buffer.from("c"));
    await deleteBucket("bucket4");
    expect(existsSync(join(getDataDir(), "files", "bucket4"))).toBe(false);
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
