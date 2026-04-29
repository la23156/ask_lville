import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  ExternalLink,
  FileText,
  BookOpen,
  Sparkles,
  Lightbulb,
  Play,
  Heart,
  Compass,
} from "lucide-react";
import { api } from "../services/api.js";
import Markdown from "./Markdown.jsx";

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function sourcePill(p) {
  const url = p.url || "";
  if (url.includes("arxiv.org")) return "arXiv";
  if (url.toLowerCase().endsWith(".pdf")) return "PDF";
  if (url.includes("nature.com")) return "Nature";
  if (url.includes("sciencemag.org") || url.includes("science.org")) return "Science";
  if (url.includes("acm.org")) return "ACM";
  if (url.includes("ieee.org")) return "IEEE";
  if (url.includes("nih.gov") || url.includes("ncbi")) return "NIH";
  if (url.includes("jstor.org")) return "JSTOR";
  if (url.includes(".edu")) return "EDU";
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
        className="bg-stone-50 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono uppercase tracking-wider text-stone-500">
              {form} · {course?.term} · {course?.department}
            </div>
            <h2 className="text-xl font-bold text-stone-900 mt-0.5">
              {course?.code} — {course?.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center py-20 text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-lville-red mb-3" />
              <div className="text-sm font-medium">
                Pulling research papers, videos, and a personalized briefing…
              </div>
              <div className="text-xs text-stone-400 mt-1">
                ~15-30 seconds on first open, instant after that
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-8">
              {/* TOP: Read further */}
              <Section
                icon={<FileText className="w-4 h-4" />}
                title="Read further"
                accent
              >
                {data.paper_callouts.length === 0 ? (
                  <p className="text-sm text-stone-500 italic">
                    No relevant papers surfaced.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {data.paper_callouts.map((p, i) => (
                      <a
                        key={i}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group border border-stone-200 rounded-lg p-3 bg-white hover:border-lville-red hover:shadow-sm transition flex flex-col"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-900 text-white font-mono">
                            {sourcePill(p)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-stone-400 ml-auto group-hover:text-lville-red" />
                        </div>
                        <div className="font-semibold text-sm text-stone-900 group-hover:text-lville-red leading-snug line-clamp-2">
                          {p.title}
                        </div>
                        <div className="text-xs text-stone-500 mt-1.5 leading-snug">
                          {p.why_read}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </Section>

              {/* TOP: Watch */}
              {data.youtube_videos && data.youtube_videos.length > 0 && (
                <Section
                  icon={<Play className="w-4 h-4" />}
                  title="Watch"
                  accent
                >
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.youtube_videos.map((v, i) => {
                      const id = getYouTubeId(v.url);
                      const thumb = id
                        ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
                        : null;
                      return (
                        <a
                          key={i}
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group border border-stone-200 rounded-lg overflow-hidden bg-white hover:border-lville-red hover:shadow-sm transition"
                        >
                          {thumb ? (
                            <div className="relative aspect-video bg-stone-900 overflow-hidden">
                              <img
                                src={thumb}
                                alt={v.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                                <div className="w-12 h-12 rounded-full bg-lville-red/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video bg-stone-200 flex items-center justify-center">
                              <Play className="w-6 h-6 text-stone-400" />
                            </div>
                          )}
                          <div className="p-3">
                            <div className="font-semibold text-sm text-stone-900 group-hover:text-lville-red leading-snug line-clamp-2">
                              {v.title}
                            </div>
                            <div className="text-xs text-stone-500 mt-1 leading-snug line-clamp-2">
                              {v.why_watch}
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* TOP: Walk in thinking about */}
              <Section
                icon={<Lightbulb className="w-4 h-4" />}
                title="Walk in thinking about"
                accent
              >
                <div className="grid sm:grid-cols-2 gap-2">
                  {data.discussion_starters.map((q, i) => (
                    <div
                      key={i}
                      className="bg-white border border-stone-200 rounded-lg p-3 flex gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-lville-red text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="text-sm text-stone-700 leading-snug self-center">
                        {q}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <hr className="border-stone-200" />

              {/* PERSONAL FIT */}
              <Section icon={<Heart className="w-4 h-4" />} title="Why you, specifically">
                <div className="bg-white border border-stone-200 rounded-lg p-4">
                  <Markdown>{data.personal_fit}</Markdown>
                </div>
              </Section>

              {/* IMPORTANCE — bulleted */}
              <Section
                icon={<BookOpen className="w-4 h-4" />}
                title="Why this course matters"
              >
                <PointsGrid points={data.importance_points} />
              </Section>

              {/* MODERN RELEVANCE — bulleted */}
              <Section
                icon={<Compass className="w-4 h-4" />}
                title="In the field today"
              >
                <PointsGrid points={data.modern_relevance_points} />
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-white text-xs text-stone-500 flex justify-between items-center">
          <span>
            Sources: course catalog · OpenAI · Exa research-paper, PDF, and YouTube search
          </span>
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
        className={`flex items-center gap-2 mb-3 text-xs uppercase tracking-wider font-bold ${
          accent ? "text-lville-red" : "text-stone-700"
        }`}
      >
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            accent ? "bg-lville-red text-white" : "bg-stone-200 text-stone-700"
          }`}
        >
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

function PointsGrid({ points }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {points.map((p, i) => (
        <div
          key={i}
          className="bg-white border border-stone-200 rounded-lg p-4 hover:border-lville-red transition"
        >
          <div className="flex items-start gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-lville-red mt-2 flex-shrink-0" />
            <div className="font-semibold text-stone-900 text-sm leading-snug">
              {p.headline}
            </div>
          </div>
          <div className="text-sm text-stone-600 leading-relaxed pl-3.5">
            <Markdown>{p.detail}</Markdown>
          </div>
        </div>
      ))}
    </div>
  );
}
