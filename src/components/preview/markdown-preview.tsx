"use client";

import { Tabs } from "@/components/tabs";

interface MarkdownPreviewProps {
  /**
   * Server-rendered HTML from our markdown pipeline (remark/rehype/shiki).
   * SECURITY: This is NOT arbitrary user HTML — it is produced by our trusted
   * unified pipeline that parses markdown syntax and generates safe HTML output.
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
  return (
    <Tabs
      defaultValue="rendered"
      tabs={[
        {
          value: "rendered",
          label: "Rendered",
          content: (
            /* SECURITY: Trusted pipeline output — see renderedHtml JSDoc above */
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ),
        },
        {
          value: "source",
          label: "Source",
          content: (
            <pre className="overflow-x-auto rounded-lg border border-border bg-surface/50 p-4 text-sm font-code text-text leading-relaxed whitespace-pre-wrap">
              {rawSource}
            </pre>
          ),
        },
      ]}
    />
  );
}
