import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-lville-red text-white rounded-br-sm"
            : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm shadow-sm"
        }`}
      >
        {msg.content}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <div className="text-xs font-semibold text-stone-500 mb-1">Sources</div>
            <ul className="text-xs text-stone-600 space-y-1">
              {msg.sources.map((s) => (
                <li key={s.id}>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-stone-100 mr-2 font-mono">
                    {s.source === "course_catalog" ? "Catalog" : "Handbook"} p.{s.page}
                  </span>
                  <span className="text-stone-500">
                    {s.preview?.slice(0, 110)}
                    {s.preview && s.preview.length > 110 ? "…" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatArea({ messages, isLoading }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-stone-500 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Reading the catalog and handbook…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
