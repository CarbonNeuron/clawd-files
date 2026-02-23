import { generateMarkdown } from "@/lib/api-docs";

export const runtime = 'nodejs';

export async function GET() {
  const markdown = generateMarkdown();

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
