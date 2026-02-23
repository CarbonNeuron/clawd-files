import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { highlight } from "@/lib/highlight";

/**
 * Decode HTML entities commonly found in code blocks after markdown rendering.
 */
function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Render markdown source to HTML with GFM support and Shiki-highlighted code blocks.
 */
export async function renderMarkdown(source: string): Promise<string> {
  // Step 1: Render markdown to HTML using unified pipeline
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(source);

  let html = String(result);

  // Step 2: Find <pre><code class="language-xxx"> blocks and replace with Shiki HTML
  const codeBlockRegex =
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g;

  const matches: {
    fullMatch: string;
    lang: string;
    code: string;
  }[] = [];

  let match;
  while ((match = codeBlockRegex.exec(html)) !== null) {
    matches.push({
      fullMatch: match[0],
      lang: match[1],
      code: decodeHtmlEntities(match[2]),
    });
  }

  // Step 3: Replace each code block with Shiki-highlighted HTML
  for (const { fullMatch, lang, code } of matches) {
    const highlighted = await highlight(code, lang);
    html = html.replace(fullMatch, highlighted);
  }

  return html;
}
