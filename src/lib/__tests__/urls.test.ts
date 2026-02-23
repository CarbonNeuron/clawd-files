import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileUrl, bucketUrl, encodePath } from "../urls";

describe("urls", () => {
  const originalBaseUrl = process.env.BASE_URL;

  beforeAll(() => {
    process.env.BASE_URL = "http://test.example.com";
  });

  afterAll(() => {
    if (originalBaseUrl) {
      process.env.BASE_URL = originalBaseUrl;
    } else {
      delete process.env.BASE_URL;
    }
  });

  it("encodePath encodes special characters but preserves slashes", () => {
    expect(encodePath("file with spaces.txt")).toBe("file%20with%20spaces.txt");
    expect(encodePath("path/to/file.txt")).toBe("path/to/file.txt");
    expect(encodePath("file#hash.txt")).toBe("file%23hash.txt");
    expect(encodePath("path/file?query.txt")).toBe("path/file%3Fquery.txt");
  });

  it("bucketUrl returns correct URLs", () => {
    const urls = bucketUrl("abc123");
    expect(urls.url).toBe("http://test.example.com/abc123");
    expect(urls.api_url).toBe("http://test.example.com/api/buckets/abc123");
  });

  it("fileUrl returns url, raw_url, and api_url without short_url", () => {
    const urls = fileUrl("abc123", "src/main.rs");
    expect(urls.url).toBe("http://test.example.com/abc123/src/main.rs");
    expect(urls.raw_url).toBe("http://test.example.com/raw/abc123/src/main.rs");
    expect(urls.api_url).toBe("http://test.example.com/api/buckets/abc123");
    expect(urls).not.toHaveProperty("short_url");
  });

  it("fileUrl properly encodes file paths", () => {
    const urls = fileUrl("abc123", "file with spaces.txt");
    expect(urls.url).toBe("http://test.example.com/abc123/file%20with%20spaces.txt");
    expect(urls.raw_url).toBe("http://test.example.com/raw/abc123/file%20with%20spaces.txt");
  });

  it("fileUrl handles nested paths", () => {
    const urls = fileUrl("abc123", "path/to/nested/file.txt");
    expect(urls.url).toBe("http://test.example.com/abc123/path/to/nested/file.txt");
    expect(urls.raw_url).toBe("http://test.example.com/raw/abc123/path/to/nested/file.txt");
  });
});
