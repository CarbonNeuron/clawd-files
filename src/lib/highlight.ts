import type { Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const LOADED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "sql",
  "bash",
  "shellscript",
  "json",
  "yaml",
  "toml",
  "html",
  "css",
  "markdown",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "ruby",
  "php",
  "dockerfile",
  "xml",
  "ini",
  "diff",
] as const;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((shiki) =>
      shiki.createHighlighter({
        themes: ["github-dark"],
        langs: [...LOADED_LANGUAGES],
      })
    );
  }
  return highlighterPromise;
}

const EXT_TO_LANG: Record<string, string> = {
  // JavaScript / TypeScript
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  // Python
  py: "python",
  pyw: "python",
  // SQL
  sql: "sql",
  // Shell
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  // Data formats
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  // Web
  html: "html",
  htm: "html",
  css: "css",
  scss: "css",
  // Markdown
  md: "markdown",
  mdx: "markdown",
  // Systems languages
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  // Scripting
  rb: "ruby",
  php: "php",
  // Config
  dockerfile: "dockerfile",
  xml: "xml",
  svg: "xml",
  ini: "ini",
  conf: "ini",
  cfg: "ini",
  env: "ini",
  // Other
  diff: "diff",
  patch: "diff",
  txt: "plaintext",
  log: "plaintext",
};

/**
 * Map a file extension to a Shiki language ID.
 * Returns "plaintext" for unknown extensions.
 */
export function extToLang(ext: string): string {
  const normalized = ext.toLowerCase().replace(/^\./, "");
  return EXT_TO_LANG[normalized] || "plaintext";
}

/**
 * Highlight code using Shiki and return an HTML string.
 * Falls back to plaintext for unknown languages.
 */
export async function highlight(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  const loadedLangs = highlighter.getLoadedLanguages();

  const resolvedLang = loadedLangs.includes(lang) ? lang : "plaintext";

  return highlighter.codeToHtml(code, {
    lang: resolvedLang,
    theme: "github-dark",
  });
}
