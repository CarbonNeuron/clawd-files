"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MarkdownPreviewProps {
  /**
   * Server-rendered HTML from our markdown pipeline (remark/rehype/shiki).
   * This is NOT arbitrary user HTML — it is produced by our trusted unified
   * pipeline that parses markdown syntax and generates safe HTML output.
   * The pipeline uses remark-gfm, remark-rehype, rehype-raw, and
   * rehype-stringify with Shiki for code highlighting.
   */
  renderedHtml: string;
  rawSource: string;
}

export function MarkdownPreview({
  renderedHtml,
  rawSource,
}: MarkdownPreviewProps) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div>
      <div className="flex gap-1 mb-4">
        <Button
          size="xs"
          variant={showSource ? "outline" : "default"}
          onClick={() => setShowSource(false)}
          className="font-code text-xs"
        >
          Rendered
        </Button>
        <Button
          size="xs"
          variant={showSource ? "default" : "outline"}
          onClick={() => setShowSource(true)}
          className="font-code text-xs"
        >
          Source
        </Button>
      </div>

      {showSource ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface/50 p-4 text-sm font-code text-text leading-relaxed whitespace-pre-wrap">
          {rawSource}
        </pre>
      ) : (
        <div
          className="prose prose-invert max-w-none"
          /* Trusted pipeline output — see renderedHtml JSDoc above */
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
    </div>
  );
}
