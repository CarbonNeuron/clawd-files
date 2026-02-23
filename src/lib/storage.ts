import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  rmSync,
  readFileSync,
  createReadStream,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import type { ReadStream } from "node:fs";

export function getDataDir(): string {
  return process.env.DATA_DIR || "./data";
}

export function getFilePath(bucketId: string, filePath: string): string {
  const bucketDir = resolve(getDataDir(), "files", bucketId);
  const fullPath = resolve(bucketDir, filePath);
  if (!fullPath.startsWith(bucketDir + "/") && fullPath !== bucketDir) {
    throw new Error("Path traversal detected");
  }
  return fullPath;
}

export async function saveFile(
  bucketId: string,
  filePath: string,
  content: Buffer,
): Promise<void> {
  const fullPath = getFilePath(bucketId, filePath);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, content);
}

export async function deleteFile(
  bucketId: string,
  filePath: string,
): Promise<void> {
  const fullPath = getFilePath(bucketId, filePath);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

export async function deleteBucket(bucketId: string): Promise<void> {
  const dir = join(getDataDir(), "files", bucketId);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function getFileStream(
  bucketId: string,
  filePath: string,
): ReadStream | null {
  const fullPath = getFilePath(bucketId, filePath);
  if (!existsSync(fullPath)) return null;
  return createReadStream(fullPath);
}

export function getFileBuffer(
  bucketId: string,
  filePath: string,
): Buffer | null {
  const fullPath = getFilePath(bucketId, filePath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath);
}
