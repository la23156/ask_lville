import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Markdown from "./Markdown.jsx";
import { useTypewriter } from "../hooks/useTypewriter.js";

function AssistantMessage({ msg, animate, onTickScroll }) {
  const { shown, isDone } = useTypewriter(msg.content, animate);

  useEffect(() => {
    if (animate && !isDone) onTickScroll?.();
  }, [shown, animate, isDone, onTickScroll]);

  return (
    <div className="bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 max-w-[85%] leading-relaxed">
      <div className="prose-sm">
        <Markdown>{shown}</Markdown>
        {animate && !isDone && (
          <span className="inline-block w-1.5 h-4 align-[-2px] bg-lville-red/70 ml-0.5 animate-pulse" />
        )}
      </div>
      {isDone && msg.sources && msg.sources.length > 0 && (
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
  );
}

function UserMessage({ msg }) {
  return (
    <div className="bg-lville-red text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] whitespace-pre-wrap leading-relaxed">
      {msg.content}
    </div>
  );
}

export default function ChatArea({ messages, isLoading, animateIdx }) {
  const endRef = useRef(null);
  const scrollToBottom = () =>
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-4`}
          >
            {m.role === "user" ? (
              <UserMessage msg={m} />
            ) : (
              <AssistantMessage
                msg={m}
                animate={i === animateIdx}
                onTickScroll={scrollToBottom}
              />
            )}
          </div>
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
