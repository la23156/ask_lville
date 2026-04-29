import { useEffect, useState } from "react";
import { X, Loader2, ExternalLink, FileText, BookOpen, Sparkles, Lightbulb } from "lucide-react";
import { api } from "../services/api.js";
import Markdown from "./Markdown.jsx";

function sourceLabel(p) {
  const url = p.url || "";
  if (url.includes("arxiv.org")) return "arXiv";
  if (url.endsWith(".pdf")) return "PDF";
  if (url.includes("nature.com")) return "Nature";
  if (url.includes("sciencemag.org") || url.includes("science.org")) return "Science";
  if (url.includes("acm.org")) return "ACM";
  if (url.includes("ieee.org")) return "IEEE";
  if (url.includes("nih.gov") || url.includes("ncbi")) return "NIH";
  if (url.includes("jstor.org")) return "JSTOR";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".").slice(-2, -1)[0] || host;
  } catch {
    return "source";
  }
}

export default function CourseDeepDiveModal({ journeyId, course, form, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!course) return;
    setLoading(true);
    setError(null);
    api
      .getCourseDeepDive(journeyId, course.code)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [journeyId, course]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 anim-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono uppercase tracking-wider text-stone-500">
              {form} · {course?.term} · {course?.department}
            </div>
            <h2 className="text-xl font-bold text-stone-900 mt-0.5">
              {course?.code} — {course?.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center py-16 text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-lville-red mb-3" />
              <div className="text-sm font-medium">Pulling research papers, current developments, and a personalized briefing…</div>
              <div className="text-xs text-stone-400 mt-1">~10 seconds</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-7">
              <Section icon={<Sparkles className="w-4 h-4" />} title="Why you, specifically">
                <Markdown>{data.personal_fit}</Markdown>
              </Section>

              <Section icon={<BookOpen className="w-4 h-4" />} title="Why this course matters">
                <Markdown>{data.importance}</Markdown>
              </Section>

              <Section
                icon={<Sparkles className="w-4 h-4" />}
                title="What's happening in this field today"
                accent
              >
                <Markdown>{data.modern_relevance}</Markdown>
              </Section>

              <Section icon={<Lightbulb className="w-4 h-4" />} title="Walk in thinking about">
                <ul className="space-y-2">
                  {data.discussion_starters.map((q, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-lville-red font-bold flex-shrink-0">{i + 1}.</span>
                      <span className="text-stone-700 leading-snug">{q}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section icon={<FileText className="w-4 h-4" />} title="Read further">
                {data.paper_callouts.length === 0 ? (
                  <p className="text-sm text-stone-500 italic">
                    No relevant papers surfaced for this course.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {data.paper_callouts.map((p, i) => (
                      <li key={i} className="border border-stone-200 rounded-lg p-3 hover:border-lville-red transition">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block group"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-stone-900 group-hover:text-lville-red leading-snug">
                                {p.title}
                              </div>
                              <div className="text-xs text-stone-500 mt-0.5">
                                {p.why_read}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
                                {sourceLabel(p)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-lville-red" />
                            </div>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 text-xs text-stone-500 flex justify-between items-center">
          <span>Sources: course catalog, OpenAI, Exa research-paper search</span>
          <button
            onClick={onClose}
            className="text-lville-red hover:underline font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, accent, children }) {
  return (
    <section>
      <div
        className={`flex items-center gap-2 mb-2 text-xs uppercase tracking-wider font-semibold ${
          accent ? "text-lville-red" : "text-stone-600"
        }`}
      >
        {icon}
        {title}
      </div>
      <div className="prose-sm text-stone-700 leading-relaxed">{children}</div>
    </section>
  );
}
