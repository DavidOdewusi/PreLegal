import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function NdaDocument({ markdown }: { markdown: string }) {
  return (
    <div className="relative rounded-sm bg-paper shadow-[0_1px_2px_rgba(32,28,22,0.06),0_18px_36px_-24px_rgba(32,28,22,0.45)] ring-1 ring-line">
      <div className="doc-prose prose max-w-none px-8 py-10 sm:px-12 sm:py-12">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
