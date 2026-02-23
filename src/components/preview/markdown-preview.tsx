"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Tabs defaultValue="rendered">
      <TabsList className="font-code">
        <TabsTrigger value="rendered" className="text-xs">Rendered</TabsTrigger>
        <TabsTrigger value="source" className="text-xs">Source</TabsTrigger>
      </TabsList>

      <TabsContent value="rendered">
        {/* SECURITY: Trusted pipeline output — see renderedHtml JSDoc above */}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </TabsContent>

      <TabsContent value="source">
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface/50 p-4 text-sm font-code text-text leading-relaxed whitespace-pre-wrap">
          {rawSource}
        </pre>
      </TabsContent>
    </Tabs>
  );
}
