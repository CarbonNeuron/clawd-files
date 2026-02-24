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
 * Rewrite relative URLs in rendered HTML so they resolve against a base path
 * instead of the page root. Handles href and src attributes.
 */
function rewriteRelativeUrls(html: string, basePath: string): string {
  return html.replace(
    /(<(?:a|img)\s[^>]*?(?:href|src))="([^"]*?)"/gi,
    (match, prefix: string, url: string) => {
      // Skip absolute URLs, protocol-relative, anchors, and data URIs
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(url)) return match;
      // Skip already-absolute paths
      if (url.startsWith("/")) return match;
      return `${prefix}="${basePath}${url}"`;
    },
  );
}

/**
 * Render markdown source to HTML with GFM support and Shiki-highlighted code blocks.
 * If basePath is provided, relative links/images are rewritten to resolve against it.
 */
export async function renderMarkdown(source: string, basePath?: string): Promise<string> {
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

  // Step 4: Rewrite relative URLs if a base path is provided
  if (basePath) {
    html = rewriteRelativeUrls(html, basePath);
  }

  return html;
}
