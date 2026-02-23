import { highlight, extToLang } from "@/lib/highlight";
import { extname } from "path";

interface CodePreviewProps {
  content: string;
  filePath: string;
}

/**
 * Server Component that renders syntax-highlighted code using Shiki.
 * The HTML is generated server-side from the Shiki highlighting engine.
 */
export async function CodePreview({ content, filePath }: CodePreviewProps) {
  const ext = extname(filePath).replace(/^\./, "");
  const lang = extToLang(ext);
  const highlightedHtml = await highlight(content, lang);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div
        className="shiki-wrapper text-sm [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!bg-surface [&_code]:font-code [&_.line]:before:content-[counter(line)] [&_.line]:before:counter-increment-[line] [&_code]:counter-reset-[line] [&_.line]:before:mr-6 [&_.line]:before:inline-block [&_.line]:before:w-4 [&_.line]:before:text-right [&_.line]:before:text-text-muted/50"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  );
}
