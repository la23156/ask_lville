import { useEffect, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { api } from "../services/api.js";
import AtmosphereStrip from "./AtmosphereStrip.jsx";
import PreliminaryPanel from "./PreliminaryPanel.jsx";

export default function JourneyWizard({ user, onComplete }) {
  const [journeyId, setJourneyId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: 10 });
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [preliminary, setPreliminary] = useState(null);

  useEffect(() => {
    if (!user) return;
    setSelected(null);
    setSubmitting(true);
    api
      .startJourney(user.id)
      .then((r) => {
        setJourneyId(r.journey_id);
        setQuestion(r.question);
        setProgress(r.progress);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSubmitting(false));
  }, [user]);

  const submit = async () => {
    // journeyId may be null on the first answer — server creates the row.
    if (!selected || !question) return;
    setSubmitting(true);
    setError(null);
    try {
      const willFinish = progress.answered + 1 >= progress.total;
      if (willFinish) setGenerating(true);
      const res = await api.answerJourney(
        journeyId,
        question.id,
        selected,
        user.id
      );
      // First answer creates the journey row server-side; capture the id.
      const newId = res.journey_id || journeyId;
      setJourneyId(newId);
      if (res.done) {
        onComplete?.(newId);
      } else {
        setQuestion(res.question);
        setProgress(res.progress);
        setSelected(null);
        if (res.preliminary) setPreliminary(res.preliminary);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  };

  const pct = Math.round((progress.answered / progress.total) * 100);

  if (generating) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-lville-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-stone-800 mb-2">
            Designing your course path…
          </h2>
          <p className="text-stone-500 text-sm max-w-md">
            Reading the catalog, matching it to your answers, and laying out
            your years at Lawrenceville.
          </p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lville-red" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
        {/* LEFT: question */}
        <div>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2 text-sm text-stone-500">
              <span>
                Question {progress.answered + 1} of {progress.total}
              </span>
              <span className="font-mono">{pct}%</span>
            </div>
            <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-lville-red transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div key={question.id} className="anim-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">
              {question.text}
            </h2>
            <p className="text-stone-500 text-sm mb-6">Pick the closest match.</p>

            <div className="grid gap-3 mb-8">
              {question.options.map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={`text-left p-4 rounded-xl border-2 transition anim-rise ${
                    selected === opt
                      ? "border-lville-red bg-lville-red/5"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selected === opt
                          ? "border-lville-red"
                          : "border-stone-300"
                      }`}
                    >
                      {selected === opt && (
                        <div className="w-2.5 h-2.5 rounded-full bg-lville-red" />
                      )}
                    </div>
                    <span className="text-stone-800">{opt}</span>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={submit}
                disabled={!selected || submitting}
                className="bg-lville-red hover:bg-red-700 disabled:bg-stone-300 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 transition"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {progress.answered + 1 >= progress.total
                      ? "Build my plan"
                      : "Next"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: atmosphere + preliminary plan */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start">
          <AtmosphereStrip />
          <PreliminaryPanel preliminary={preliminary} />
        </aside>
      </div>
    </div>
  );
}
