"use client";

import { useState, useRef, useCallback } from "react";

type UploadedFile = {
  path: string;
  size: number;
  mime_type: string;
  url: string;
  raw_url: string;
};

type UploadState = "idle" | "uploading" | "done" | "error";

export function UploadForm({
  bucketId,
  token,
}: {
  bucketId: string;
  token: string;
}) {
  const [state, setState] = useState<UploadState>("idle");
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setState("uploading");
      setError("");
      setProgress(0);

      const formData = new FormData();
      for (const file of fileArray) {
        formData.append("files", file);
      }

      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/buckets/${bucketId}/upload?token=${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        const response = await new Promise<{ ok: boolean; status: number; body: string }>(
          (resolve, reject) => {
            xhr.onload = () =>
              resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText });
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(formData);
          },
        );

        if (!response.ok) {
          const data = JSON.parse(response.body);
          setError(data.error || "Upload failed");
          setState("error");
          return;
        }

        const data = JSON.parse(response.body);
        setUploaded((prev) => [...prev, ...data.uploaded]);
        setState("done");
      } catch {
        setError("Upload failed. Please try again.");
        setState("error");
      }
    },
    [bucketId, token],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        upload(e.dataTransfer.files);
      }
    },
    [upload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        upload(e.target.files);
      }
    },
    [upload],
  );

  const resetForMore = () => {
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => state !== "uploading" && inputRef.current?.click()}
        className={`
          relative rounded-lg border-2 border-dashed p-12 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? "border-accent bg-accent/5 glow-cyan"
            : "border-border hover:border-accent/40 hover:bg-surface/50"
          }
          ${state === "uploading" ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {state === "uploading" ? (
          <div>
            <div className="text-sm text-text-muted font-code mb-4">
              Uploading... {progress}%
            </div>
            <div className="w-full max-w-xs mx-auto h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4 opacity-30">
              {dragOver ? "+" : "^"}
            </div>
            <p className="text-sm text-text-muted font-code">
              Drop files here or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {state === "error" && (
        <div className="mt-4 rounded-lg border border-accent-warm/30 bg-accent-warm/5 p-4">
          <p className="text-sm text-accent-warm font-code">{error}</p>
          <button onClick={resetForMore} className="btn btn-outline btn-sm mt-3">
            Try again
          </button>
        </div>
      )}

      {/* Success — upload more */}
      {state === "done" && (
        <div className="mt-4 text-center">
          <button onClick={resetForMore} className="btn btn-outline btn-sm">
            Upload more files
          </button>
        </div>
      )}

      {/* Uploaded files list */}
      {uploaded.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-heading font-semibold text-text-muted mb-3 uppercase tracking-wider">
            Uploaded Files
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {uploaded.map((file, i) => (
              <a
                key={`${file.path}-${i}`}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border last:border-b-0"
              >
                <span className="text-sm font-code text-accent truncate">
                  {file.path}
                </span>
                <span className="text-xs text-text-muted font-code ml-4 shrink-0">
                  {formatSize(file.size)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
