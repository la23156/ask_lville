import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />
  ),
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => (
    <strong className="font-semibold" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  h1: ({ node, ...props }) => (
    <h1 className="text-xl font-bold mt-3 mb-2" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-base font-bold mt-2 mb-1" {...props} />
  ),
  code: ({ inline, className, children, ...props }) =>
    inline ? (
      <code
        className="px-1 py-0.5 rounded bg-stone-100 text-stone-800 text-[0.9em] font-mono"
        {...props}
      >
        {children}
      </code>
    ) : (
      <pre className="bg-stone-900 text-stone-100 rounded-lg p-3 overflow-x-auto my-2 text-sm">
        <code {...props}>{children}</code>
      </pre>
    ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-4 border-stone-300 pl-3 italic text-stone-600 my-2"
      {...props}
    />
  ),
  a: ({ node, ...props }) => (
    <a
      className="text-lville-red underline hover:text-red-700"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border border-stone-200" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => (
    <th
      className="px-2 py-1 bg-stone-100 border border-stone-200 text-left font-semibold"
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td className="px-2 py-1 border border-stone-200" {...props} />
  ),
  hr: () => <hr className="my-3 border-stone-200" />,
};

export default function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children || ""}
    </ReactMarkdown>
  );
}
