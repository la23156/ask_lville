import { useMemo } from "react";
import {
  greetings,
  categorizedQuestions,
  quickStartQuestions,
} from "../data/lvilleData.js";

export default function EmptyState({ onPickQuestion, onOpenJourney, userName }) {
  const greeting = useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    []
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lville-red text-white text-3xl font-bold mb-6">
            L
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-800 mb-2">
            Hi{userName ? `, ${userName.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-stone-500">{greeting}</p>
        </div>

        {onOpenJourney && (
          <button
            onClick={onOpenJourney}
            className="w-full mb-8 group bg-gradient-to-r from-lville-red to-red-700 text-white rounded-xl p-5 text-left shadow-md hover:shadow-lg transition flex items-center gap-4"
          >
            <div className="text-4xl">🗺️</div>
            <div className="flex-1">
              <div className="font-bold text-lg">Build my Course Journey</div>
              <div className="text-sm text-white/85 mt-0.5">
                Answer 10 quick questions and get a personalized Form-by-Form
                course plan, visualized as a graph.
              </div>
            </div>
            <div className="text-white/70 group-hover:translate-x-1 transition">→</div>
          </button>
        )}

        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-3 text-center">
            Try one of these to get started
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickStartQuestions.map((q) => (
              <button
                key={q.title}
                onClick={() => onPickQuestion(q.question)}
                className="text-left p-4 rounded-xl border border-stone-200 bg-white hover:border-lville-red hover:shadow-sm transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{q.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-stone-800 group-hover:text-lville-red mb-1">
                      {q.title}
                    </div>
                    <div className="text-sm text-stone-500 leading-snug">
                      {q.question}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 text-center">
            Or browse by topic
          </div>
          {categorizedQuestions.map((cat) => (
            <div key={cat.category}>
              <div className="text-sm font-semibold text-stone-700 mb-2">
                {cat.category}
              </div>
              <div className="grid gap-2">
                {cat.questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => onPickQuestion(q)}
                    className="text-left px-4 py-2.5 text-sm rounded-lg border border-stone-200 bg-white hover:bg-lville-cream hover:border-lville-red text-stone-700 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
