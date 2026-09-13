import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function NdaDocument({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-zinc max-w-none rounded-lg border border-zinc-200 bg-white p-8 dark:prose-invert dark:border-zinc-800 dark:bg-zinc-950">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
