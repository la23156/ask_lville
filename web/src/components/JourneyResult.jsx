import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../services/api.js";
import { Loader2, ExternalLink, RefreshCw, BookOpen, FileText, Lightbulb } from "lucide-react";
import CourseDeepDiveModal from "./CourseDeepDiveModal.jsx";

const FORM_ORDER = ["II Form", "III Form", "IV Form", "V Form", "Post-Graduate"];
const TERM_ORDER = ["Year-long", "T1", "T2", "T3", "Yearlong", "Year long"];

function termRank(t) {
  const idx = TERM_ORDER.findIndex((x) => x.toLowerCase() === (t || "").toLowerCase());
  return idx === -1 ? 999 : idx;
}

function CourseNode({ data }) {
  return (
    <div
      className={`bg-white border-2 rounded-xl px-3 py-2 shadow-sm w-52 cursor-pointer transition hover:shadow-md ${
        data.selected ? "border-lville-red" : "border-stone-200"
      }`}
      onClick={data.onClick}
    >
      <Handle type="target" position={Position.Left} className="!bg-stone-400" />
      <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wide">
        {data.term} · {data.department}
      </div>
      <div className="font-semibold text-sm text-stone-900 leading-tight mt-0.5">
        {data.code}
      </div>
      <div className="text-xs text-stone-600 leading-snug">{data.name}</div>
      <Handle type="source" position={Position.Right} className="!bg-stone-400" />
    </div>
  );
}

function FormHeader({ data }) {
  return (
    <div className="text-center pointer-events-none">
      <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {data.form}
      </div>
      <div className="text-[10px] text-stone-400 mt-0.5 italic max-w-[200px]">
        {data.theme}
      </div>
    </div>
  );
}

const nodeTypes = { course: CourseNode, formHeader: FormHeader };

function buildFlow(plan, selectedCode, onSelect) {
  const sortedForms = [...plan.forms].sort(
    (a, b) => FORM_ORDER.indexOf(a.form) - FORM_ORDER.indexOf(b.form)
  );

  const nodes = [];
  const codeToNodeId = new Map();
  const COL_WIDTH = 240;
  const ROW_HEIGHT = 110;

  sortedForms.forEach((f, formIdx) => {
    const x = formIdx * COL_WIDTH;
    nodes.push({
      id: `header-${formIdx}`,
      type: "formHeader",
      position: { x: x - 10, y: -50 },
      data: { form: f.form, theme: f.theme },
      draggable: false,
      selectable: false,
    });

    const sorted = [...f.courses].sort(
      (a, b) => termRank(a.term) - termRank(b.term)
    );
    sorted.forEach((c, i) => {
      const id = `${formIdx}-${c.code}-${i}`;
      codeToNodeId.set(c.code, id);
      nodes.push({
        id,
        type: "course",
        position: { x, y: i * ROW_HEIGHT },
        data: {
          ...c,
          form: f.form,
          selected: selectedCode === c.code,
          onClick: () => onSelect({ ...c, form: f.form }),
        },
      });
    });
  });

  const edges = (plan.edges || [])
    .map((e) => {
      const src = codeToNodeId.get(e.from);
      const dst = codeToNodeId.get(e.to);
      if (!src || !dst) return null;
      return {
        id: `e-${src}-${dst}`,
        source: src,
        target: dst,
        label: e.label,
        style: { stroke: "#A6192E", strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: "#666" },
      };
    })
    .filter(Boolean);

  return { nodes, edges };
}

export default function JourneyResult({ journeyId, onRestart }) {
  const [journey, setJourney] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [deepDiveCourse, setDeepDiveCourse] = useState(null);

  useEffect(() => {
    if (!journeyId) return;
    api
      .getJourney(journeyId)
      .then((j) => {
        setJourney(j);
        const first = j.plan?.forms?.[0]?.courses?.[0];
        if (first) setSelected({ ...first, form: j.plan.forms[0].form });
      })
      .catch((e) => setError(e.message));
  }, [journeyId]);

  const flow = useMemo(() => {
    if (!journey?.plan) return { nodes: [], edges: [] };
    return buildFlow(journey.plan, selected?.code, setSelected);
  }, [journey, selected]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  if (!journey || !journey.plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lville-red" />
      </div>
    );
  }

  const { plan, enrichment } = journey;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-stone-900">
              Your Lawrenceville Course Journey
            </h1>
            <p className="text-sm text-stone-600 mt-1 leading-snug">
              {plan.summary}
            </p>
          </div>
          <button
            onClick={onRestart}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-stone-300 rounded-full hover:bg-stone-50"
          >
            <RefreshCw className="w-3 h-3" /> Build another
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-stone-50 relative">
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.4}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} color="#e7e5e4" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="w-80 border-l border-stone-200 bg-white overflow-y-auto">
          {selected ? (
            <div className="p-5">
              <div className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                {selected.form} · {selected.term} · {selected.department}
              </div>
              <h2 className="text-lg font-bold text-stone-900 mt-1">
                {selected.code}
              </h2>
              <div className="text-sm text-stone-700 font-medium mb-4">
                {selected.name}
              </div>
              <div className="text-xs uppercase tracking-wider font-semibold text-lville-red mb-1.5">
                Why this fits you
              </div>
              <p className="text-sm text-stone-700 leading-relaxed mb-5">
                {selected.reason}
              </p>

              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 mb-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 mb-2">
                  In a Learn more briefing
                </div>
                <ul className="space-y-1.5 text-xs text-stone-600">
                  <li className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-lville-red" />
                    arXiv + free academic PDFs to dig into
                  </li>
                  <li className="flex items-center gap-2">
                    <Lightbulb className="w-3 h-3 text-lville-red" />
                    YouTube lectures &amp; deep-dive talks
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3 text-lville-red" />
                    Discussion prompts + 2026 field updates
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setDeepDiveCourse(selected)}
                className="w-full bg-lville-red hover:bg-red-700 text-white py-2 rounded-lg font-medium text-sm transition"
              >
                Learn more about {selected.code} →
              </button>
            </div>
          ) : (
            <div className="p-5 text-sm text-stone-500">
              Click a course to see why it's part of your plan.
            </div>
          )}

          {enrichment && enrichment.results && enrichment.results.length > 0 && (
            <div className="border-t border-stone-200 p-5">
              <div className="text-xs uppercase tracking-wider font-semibold text-stone-600 mb-3">
                Beyond Lawrenceville
              </div>
              <p className="text-xs text-stone-500 mb-3 italic">
                External pathways for students with this profile
              </p>
              <ul className="space-y-3">
                {enrichment.results.map((r, i) => (
                  <li key={i}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block group"
                    >
                      <div className="text-sm font-medium text-stone-800 group-hover:text-lville-red flex items-start gap-1">
                        <span className="flex-1">{r.title}</span>
                        <ExternalLink className="w-3 h-3 mt-0.5 text-stone-400" />
                      </div>
                      {r.summary && (
                        <div className="text-xs text-stone-500 mt-0.5 leading-snug">
                          {r.summary.slice(0, 140)}
                          {r.summary.length > 140 ? "…" : ""}
                        </div>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {deepDiveCourse && (
        <CourseDeepDiveModal
          journeyId={journeyId}
          course={deepDiveCourse}
          form={deepDiveCourse.form}
          onClose={() => setDeepDiveCourse(null)}
        />
      )}
    </div>
  );
}
