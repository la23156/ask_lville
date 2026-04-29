import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const CONFIDENCE_LABEL = {
  forming: "Just getting a sense…",
  emerging: "A direction is taking shape",
  clear: "Your path is coming into focus",
};

export default function PreliminaryPanel({ preliminary }) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (preliminary) setAnimKey((k) => k + 1);
  }, [preliminary?.headline]);

  if (!preliminary) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-5 text-center">
        <Sparkles className="w-5 h-5 mx-auto text-stone-400 mb-2" />
        <div className="text-sm font-medium text-stone-600">
          Your draft plan will appear here
        </div>
        <div className="text-xs text-stone-400 mt-1">
          Answer a couple more questions and we'll start sketching it
        </div>
      </div>
    );
  }

  return (
    <div key={animKey} className="space-y-3 anim-fade-in">
      <div>
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-500">
          <Sparkles className="w-3 h-3 text-lville-red" />
          {CONFIDENCE_LABEL[preliminary.confidence] || "Draft plan"}
        </div>
        <div className="text-base font-semibold text-stone-800 mt-1 leading-snug">
          {preliminary.headline}
        </div>
      </div>

      <div className="space-y-2">
        {preliminary.themes.map((t, i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 bg-white p-3 anim-rise"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="font-medium text-sm text-stone-800">{t.title}</div>
            {t.courses && t.courses.length > 0 && (
              <div className="flex flex-wrap gap-1 my-1.5">
                {t.courses.map((c) => (
                  <span
                    key={c}
                    className="inline-block px-1.5 py-0.5 rounded bg-lville-cream text-stone-700 text-[11px] font-mono"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs text-stone-500 leading-snug">{t.why}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
