import { highlight, extToLang } from "@/lib/highlight";
import { extname } from "node:path";

interface CodePreviewProps {
  content: string;
  filePath: string;
}

/**
 * Server Component that renders syntax-highlighted code using Shiki.
 * SECURITY: The HTML is generated server-side by the trusted Shiki highlighting
 * engine, which produces safe HTML with spans for syntax tokens — no
 * user-controlled HTML is passed through. Shiki escapes all content.
 */
export async function CodePreview({ content, filePath }: CodePreviewProps) {
  const ext = extname(filePath).replace(/^\./, "");
  const lang = extToLang(ext);
  // SECURITY: Shiki's codeToHtml escapes all content and produces safe HTML
  // with only <pre>, <code>, and <span> tags with style attributes.
  const highlightedHtml = await highlight(content, lang);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/50">
      {/* Terminal-style header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg/30">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-warm/50" />
          <span className="w-2 h-2 rounded-full bg-accent/25" />
          <span className="w-2 h-2 rounded-full bg-border" />
        </div>
        <span className="ml-1 text-[11px] text-text-muted/60 font-code">{filePath.split("/").pop()}</span>
      </div>

      {/* SECURITY: HTML from Shiki engine — escapes all input, produces safe spans */}
      <div
        className="shiki-wrapper overflow-x-auto text-sm [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!bg-transparent [&_code]:font-code [&_.line]:before:content-[counter(line)] [&_.line]:before:counter-increment-[line] [&_code]:counter-reset-[line] [&_.line]:before:mr-6 [&_.line]:before:inline-block [&_.line]:before:w-4 [&_.line]:before:text-right [&_.line]:before:text-text-muted/30"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  );
}
