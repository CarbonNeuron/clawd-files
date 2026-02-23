"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MarkdownPreviewProps {
  /** Server-rendered HTML from our markdown pipeline (remark/rehype/shiki) */
  renderedHtml: string;
  rawSource: string;
}

/**
 * Client component for toggling between rendered markdown and raw source.
 * The renderedHtml prop is generated server-side by our own rendering pipeline.
 */
export function MarkdownPreview({
  renderedHtml,
  rawSource,
}: MarkdownPreviewProps) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant={showSource ? "outline" : "default"}
          onClick={() => setShowSource(false)}
        >
          Rendered
        </Button>
        <Button
          size="sm"
          variant={showSource ? "default" : "outline"}
          onClick={() => setShowSource(true)}
        >
          Source
        </Button>
      </div>

      {showSource ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm font-code text-text leading-relaxed whitespace-pre-wrap">
          {rawSource}
        </pre>
      ) : (
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
    </div>
  );
}
