import { Send } from "lucide-react";
import { useState, useEffect } from "react";
import { placeholderOptions } from "../data/lvilleData.js";

export default function ChatInputBar({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % placeholderOptions.length),
      3500
    );
    return () => clearInterval(t);
  }, []);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="border-t border-stone-200 bg-white px-4 md:px-8 py-4">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <textarea
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholderOptions[placeholderIdx]}
          className="flex-1 resize-none border border-stone-300 rounded-2xl px-4 py-3 focus:outline-none focus:border-lville-red focus:ring-2 focus:ring-lville-red/20 max-h-40"
          disabled={disabled}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="bg-lville-red hover:bg-red-700 disabled:bg-stone-300 text-white p-3 rounded-full transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
