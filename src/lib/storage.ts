import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  rmSync,
  readFileSync,
  createReadStream,
} from "fs";
import { join, dirname } from "path";
import type { ReadStream } from "fs";

export function getDataDir(): string {
  return process.env.DATA_DIR || "./data";
}

export function getFilePath(bucketId: string, filePath: string): string {
  const normalized = filePath.replace(/\.\./g, "").replace(/^\/+/, "");
  return join(getDataDir(), "files", bucketId, normalized);
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
