import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { greetings, categorizedQuestions } from "../data/lvilleData.js";

export default function EmptyState({ onPickQuestion, userName }) {
  const greeting = useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    []
  );
  const [openCat, setOpenCat] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-10">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lville-red text-white text-3xl font-bold mb-6">
          L
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-800 mb-2">
          Hi{userName ? `, ${userName.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-stone-500 mb-10">{greeting}</p>

        <div className="grid gap-3 text-left">
          {categorizedQuestions.map((cat) => {
            const open = openCat === cat.category;
            return (
              <div
                key={cat.category}
                className="border border-stone-200 rounded-xl bg-white overflow-hidden"
              >
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50"
                  onClick={() => setOpenCat(open ? null : cat.category)}
                >
                  <span className="font-medium text-stone-700">
                    {cat.category}
                  </span>
                  {open ? (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  )}
                </button>
                {open && (
                  <ul className="border-t border-stone-100">
                    {cat.questions.map((q) => (
                      <li key={q}>
                        <button
                          className="w-full text-left px-4 py-3 hover:bg-lville-cream text-sm text-stone-700"
                          onClick={() => onPickQuestion(q)}
                        >
                          {q}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
