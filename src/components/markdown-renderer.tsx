import { renderMarkdown } from "@/lib/markdown";

interface MarkdownRendererProps {
  source: string;
}

/**
 * Async Server Component that renders markdown source to HTML.
 * Uses unified/remark/rehype pipeline with Shiki syntax highlighting.
 * Content is rendered server-side from files stored in the bucket.
 */
export async function MarkdownRenderer({ source }: MarkdownRendererProps) {
  const html = await renderMarkdown(source);

  return (
    <div
      className="prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
