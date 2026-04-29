import { getDb } from "./db.js";
import { openai, CHAT_MODEL } from "./openai.js";
import { multiQueryRetrieve } from "./rag.js";

const TARGET_QUESTIONS = 10;

// ---------- Question bank helpers ----------
function activeQuestions(db) {
  return db
    .prepare("SELECT id, key, text, options, category FROM questions WHERE active = 1")
    .all()
    .map((r) => ({ ...r, options: JSON.parse(r.options) }));
}

function getQuestion(db, id) {
  const row = db
    .prepare("SELECT id, key, text, options, category FROM questions WHERE id = ?")
    .get(id);
  if (!row) return null;
  return { ...row, options: JSON.parse(row.options) };
}

function insertGeneratedQuestion(db, { text, options, category }) {
  const info = db
    .prepare(
      "INSERT INTO questions (text, options, category, source) VALUES (?, ?, ?, 'generated')"
    )
    .run(text, JSON.stringify(options), category || "generated");
  return getQuestion(db, Number(info.lastInsertRowid));
}

function bumpQuestionUse(db, id) {
  db.prepare("UPDATE questions SET use_count = use_count + 1 WHERE id = ?").run(id);
}

// ---------- Smart question selector ----------
const SELECTOR_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["pick", "generate", "ready"] },
    question_id: { type: ["integer", "null"] },
    new_question: {
      type: ["object", "null"],
      properties: {
        text: { type: "string" },
        options: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 6,
        },
        category: { type: "string" },
      },
      required: ["text", "options", "category"],
      additionalProperties: false,
    },
    reasoning: { type: "string" },
  },
  required: ["action", "question_id", "new_question", "reasoning"],
  additionalProperties: false,
};

const SELECTOR_SYSTEM = `You are an academic advisor at The Lawrenceville School designing a 10-question multiple-choice survey to plan a student's course path across their Forms (II, III, IV, V).

Your job at each step: choose the single most informative next question.

Rules:
- Prefer EXISTING bank questions when one fits. Only generate a new question if the bank has nothing useful for the next-most-important dimension to learn about this student.
- Each question MUST be multiple choice with 3-6 options (mutually exclusive, one obvious answer per student).
- Avoid asking about the same dimension twice (the categories are: demographics, academic_lean, math, language, arts, athletics, load, future, depth, style, extracurricular, and similar).
- After ${TARGET_QUESTIONS} questions answered, return action="ready".
- Never generate a question whose category and intent overlaps with one already asked.

Return JSON matching the schema. Set unused fields to null. "reasoning" is one short sentence.`;

export async function selectNextQuestion(db, journey) {
  const answered = JSON.parse(journey.answers || "[]");

  if (answered.length >= TARGET_QUESTIONS) {
    return { action: "ready" };
  }

  const bank = activeQuestions(db);
  const askedIds = new Set(answered.map((a) => a.question_id));
  const askedCategories = new Set(answered.map((a) => a.category));
  const available = bank.filter(
    (q) => !askedIds.has(q.id) && !askedCategories.has(q.category)
  );

  // Always force first question to be Form (most important context)
  if (answered.length === 0) {
    const form = bank.find((q) => q.key === "form");
    if (form) return { action: "pick", question_id: form.id };
  }

  const userMsg = JSON.stringify(
    {
      answers_so_far: answered.map((a) => ({
        question: a.text,
        chose: a.choice,
        category: a.category,
      })),
      remaining_questions_in_bank: available.map((q) => ({
        id: q.id,
        text: q.text,
        category: q.category,
      })),
      total_target: TARGET_QUESTIONS,
      so_far: answered.length,
    },
    null,
    2
  );

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: SELECTOR_SYSTEM },
      { role: "user", content: userMsg },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "selector", strict: true, schema: SELECTOR_SCHEMA },
    },
  });

  const decision = JSON.parse(completion.choices[0].message.content);
  return decision;
}

// ---------- Plan generator ----------
const PLAN_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    forms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          form: {
            type: "string",
            enum: ["II Form", "III Form", "IV Form", "V Form", "Post-Graduate"],
          },
          theme: { type: "string" },
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                name: { type: "string" },
                department: { type: "string" },
                term: { type: "string" }, // "Year-long" | "T1" | "T2" | "T3"
                reason: { type: "string" },
              },
              required: ["code", "name", "department", "term", "reason"],
              additionalProperties: false,
            },
          },
        },
        required: ["form", "theme", "courses"],
        additionalProperties: false,
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          label: { type: "string" },
        },
        required: ["from", "to", "label"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "forms", "edges"],
  additionalProperties: false,
};

const PLAN_SYSTEM = `You are an academic advisor at The Lawrenceville School designing a personalized multi-year course plan.

Use the student's survey answers and the catalog excerpts provided to recommend a Form-by-Form course schedule from the student's current Form through V Form (or PG year if applicable).

REQUIREMENTS:
- ONLY recommend courses that appear in the catalog excerpts. Use real course codes and names verbatim.
- For each Form covered, output 4-7 courses across the year, mixing year-long and trimester offerings, AND meet Lawrenceville's distribution requirements (English, math, science, history, language, arts, athletics).
- Each course's "reason" must be 2-3 sentences (40-90 words) that tie SPECIFICALLY to MULTIPLE of the student's survey answers — call out at least two of their answers by name (e.g., "Given your interest in X and your stated goal of Y, this course..."). Mention what skills or habits of mind the course will build for them, not just a generic blurb.
- "edges" should connect course codes that form a sequence (a prereq leading to a follow-on, e.g., MA403 -> MA503). Only include edges where both endpoints appear in your "forms" output.
- "summary" is a 2-3 sentence narrative of the overall plan and how it serves the student's goals.

If the student is already in IV or V Form, only plan from their current Form forward. If II Form, plan all four years.`;

export async function generatePlan(db, journey) {
  const answers = JSON.parse(journey.answers || "[]");

  // Build retrieval query from the student's interests
  const retrievalQuery = buildRetrievalQuery(answers);
  const { fused } = await multiQueryRetrieve(retrievalQuery);

  const catalogContext = fused
    .filter((c) => c.source === "course_catalog")
    .slice(0, 12)
    .map(
      (c, i) =>
        `[#${i + 1}] catalog p.${c.page}\n${c.content.slice(0, 1400)}`
    )
    .join("\n\n---\n\n");

  const userMsg = `STUDENT SURVEY ANSWERS:
${answers.map((a, i) => `${i + 1}. ${a.text}\n   → ${a.choice}`).join("\n")}

CATALOG EXCERPTS:
${catalogContext}

Generate the multi-year course plan as JSON.`;

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: PLAN_SYSTEM },
      { role: "user", content: userMsg },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "plan", strict: true, schema: PLAN_SCHEMA },
    },
  });

  return JSON.parse(completion.choices[0].message.content);
}

function buildRetrievalQuery(answers) {
  const parts = answers.map((a) => `${a.text} ${a.choice}`).join(". ");
  return `Lawrenceville course recommendations for a student who: ${parts}`;
}

// ---------- Course deep dive ----------
const DEEP_DIVE_SCHEMA = {
  type: "object",
  properties: {
    personal_fit: { type: "string" },
    importance: { type: "string" },
    modern_relevance: { type: "string" },
    discussion_starters: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 6,
    },
    paper_callouts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          why_read: { type: "string" },
        },
        required: ["title", "url", "why_read"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "personal_fit",
    "importance",
    "modern_relevance",
    "discussion_starters",
    "paper_callouts",
  ],
  additionalProperties: false,
};

const DEEP_DIVE_SYSTEM = `You are a thoughtful peer-mentor to a Lawrenceville student. Your job is to give them rich, motivating context about a single course on their plan — why it's right for THEM specifically, why it matters as a discipline, and how its topics connect to active scholarship and the world in 2026.

Output JSON with these fields (markdown allowed in the prose fields):

- personal_fit: 2-3 short paragraphs. Tie this course to MULTIPLE specifics of THIS student's survey answers. Be concrete — name the answers and connect them to skills/topics in the course. Avoid empty platitudes.
- importance: 2-3 short paragraphs on why the course matters intellectually — the habits of mind it builds, what it teaches you to do, and what it sets you up for academically.
- modern_relevance: 2-3 short paragraphs on how the course's core topics connect to active scholarship, contemporary technology and science, and current events as of 2026. Be concrete — reference specific developments, debates, or applications. Use **bold** sparingly to highlight key terms.
- discussion_starters: 3-5 thought-provoking open questions a student should walk into the first day of class with. Frame them to provoke real thinking, not factual recall.
- paper_callouts: pick 3-5 papers from the candidate list that are most relevant. For each, copy the URL EXACTLY from the input, write a 1-line "why_read" tying it to the course topics or this student's interests.

Speak as a peer-mentor: warm, direct, intellectually serious. No bullet-fluff, no preachy moralizing.`;

async function exaSearchPapers(courseTopic) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  const queries = [
    {
      query: `${courseTopic} recent research advances`,
      numResults: 5,
      category: "research paper",
      contents: { summary: { query: "key findings, methods, or arguments" } },
    },
    {
      query: `${courseTopic}`,
      numResults: 4,
      includeDomains: ["arxiv.org"],
      contents: { summary: { query: "core contribution and implications" } },
    },
    {
      query: `${courseTopic} accessible introduction overview`,
      numResults: 3,
      category: "pdf",
      contents: { summary: { query: "main ideas and applications" } },
    },
  ];

  const all = [];
  await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers,
          body: JSON.stringify(q),
        });
        if (!res.ok) return;
        const data = await res.json();
        for (const r of data.results || []) {
          all.push({
            title: r.title,
            url: r.url,
            summary: (r.summary || r.text || "").slice(0, 280),
            published: r.publishedDate,
            source: q.includeDomains?.[0] || q.category || "search",
          });
        }
      } catch (e) {
        // ignore individual failures
      }
    })
  );

  const seen = new Set();
  return all
    .filter((p) => {
      if (!p.url || !p.title || seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    })
    .slice(0, 14);
}

export async function courseDeepDive(db, journeyId, courseCode) {
  const cached = db
    .prepare(
      "SELECT data FROM course_deep_dives WHERE journey_id = ? AND course_code = ?"
    )
    .get(journeyId, courseCode);
  if (cached) return JSON.parse(cached.data);

  const journey = getJourney(db, journeyId);
  if (!journey || !journey.plan) throw new Error("Journey or plan not found");

  let foundCourse = null;
  let foundForm = null;
  for (const f of journey.plan.forms) {
    for (const c of f.courses) {
      if (c.code === courseCode) {
        foundCourse = c;
        foundForm = f.form;
        break;
      }
    }
    if (foundCourse) break;
  }
  if (!foundCourse)
    throw new Error(`Course ${courseCode} is not in this journey's plan`);

  const courseTopic = `${foundCourse.code} ${foundCourse.name} ${foundCourse.department}`;

  // Run catalog retrieval and Exa paper search in parallel
  const [retrieval, papers] = await Promise.all([
    multiQueryRetrieve(courseTopic),
    exaSearchPapers(`${foundCourse.name} ${foundCourse.department}`),
  ]);

  const catalogContext = retrieval.fused
    .filter((c) => c.source === "course_catalog")
    .slice(0, 4)
    .map((c) => `[catalog p.${c.page}] ${c.content.slice(0, 1200)}`)
    .join("\n---\n");

  const userMsg = `STUDENT'S SURVEY ANSWERS:
${journey.answers
  .map((a, i) => `${i + 1}. ${a.text} → ${a.choice}`)
  .join("\n")}

COURSE:
- Code: ${foundCourse.code}
- Name: ${foundCourse.name}
- Department: ${foundCourse.department}
- Form / Term: ${foundForm} · ${foundCourse.term}
- Plan rationale: ${foundCourse.reason}

CATALOG EXCERPTS:
${catalogContext}

CANDIDATE PAPERS (you'll pick 3-5 for paper_callouts; copy URLs exactly):
${papers
  .map(
    (p, i) =>
      `[${i + 1}] ${p.title}\n   url: ${p.url}\n   summary: ${p.summary}`
  )
  .join("\n\n")}

Generate the deep-dive JSON now.`;

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.4,
    messages: [
      { role: "system", content: DEEP_DIVE_SYSTEM },
      { role: "user", content: userMsg },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "deep_dive",
        strict: true,
        schema: DEEP_DIVE_SCHEMA,
      },
    },
  });

  const result = JSON.parse(completion.choices[0].message.content);
  result.papers_all = papers; // keep full candidate set for reference
  result.course = foundCourse;
  result.form = foundForm;

  db.prepare(
    "INSERT OR REPLACE INTO course_deep_dives (journey_id, course_code, data) VALUES (?, ?, ?)"
  ).run(journeyId, courseCode, JSON.stringify(result));

  return result;
}

// ---------- Preliminary plan (during wizard) ----------
const PRELIM_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    confidence: { type: "string", enum: ["forming", "emerging", "clear"] },
    themes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          courses: { type: "array", items: { type: "string" } },
          why: { type: "string" },
        },
        required: ["title", "courses", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["headline", "confidence", "themes"],
  additionalProperties: false,
};

const PRELIM_SYSTEM = `You are an academic advisor sketching a PROVISIONAL Lawrenceville course path while the student is still answering a 10-question survey.
Given the answers so far and excerpts from the course catalog, return:
- "headline": a one-line direction (e.g. "Humanities-leaning STEM path with strong language work")
- "confidence": "forming" if 2-4 answers, "emerging" if 5-7, "clear" if 8-10
- "themes": 2-3 short cards. Each: a title, 2-4 likely course codes from the catalog excerpts, and a 1-sentence "why".
Use real course codes from the excerpts only. Be brief — this is a sneak preview, not the final plan.`;

export async function generatePreliminaryPlan(db, journey) {
  const answers = JSON.parse(journey.answers || "[]");
  if (answers.length < 2) return null;

  try {
    const retrievalQuery = buildRetrievalQuery(answers);
    const { fused } = await multiQueryRetrieve(retrievalQuery);
    const catalogContext = fused
      .filter((c) => c.source === "course_catalog")
      .slice(0, 6)
      .map((c) => `[catalog p.${c.page}] ${c.content.slice(0, 800)}`)
      .join("\n---\n");

    const userMsg = `ANSWERS SO FAR (${answers.length}/${TARGET_QUESTIONS}):
${answers.map((a, i) => `${i + 1}. ${a.text} → ${a.choice}`).join("\n")}

CATALOG EXCERPTS:
${catalogContext}`;

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: PRELIM_SYSTEM },
        { role: "user", content: userMsg },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "prelim", strict: true, schema: PRELIM_SCHEMA },
      },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (e) {
    console.warn("preliminary plan failed:", e.message);
    return null;
  }
}

// ---------- Atmosphere images (Exa-sourced) ----------
let _atmosphereCache = null;
let _atmosphereExpiry = 0;
const ATMOSPHERE_TTL_MS = 24 * 60 * 60 * 1000;

const ATMOSPHERE_QUERIES = [
  "Lawrenceville School Harkness classroom",
  "Lawrenceville School campus quad chapel",
  "Lawrenceville School student life traditions",
  "Lawrenceville School athletics fields",
  "Lawrenceville School arts theater music",
  "Lawrenceville School science labs",
];

export async function getAtmosphereImages() {
  if (_atmosphereCache && Date.now() < _atmosphereExpiry) return _atmosphereCache;

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const collected = [];
  await Promise.all(
    ATMOSPHERE_QUERIES.map(async (q) => {
      try {
        const res = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            query: q,
            numResults: 4,
            type: "auto",
            includeDomains: ["lawrenceville.org"],
            contents: {},
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        for (const r of data.results || []) {
          if (r.image && /^https?:\/\//.test(r.image)) {
            collected.push({
              url: r.image,
              title: r.title,
              sourceUrl: r.url,
              query: q,
            });
          }
        }
      } catch (e) {
        // swallow individual query failures
      }
    })
  );

  // Dedupe by URL
  const seen = new Set();
  const unique = collected.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });

  _atmosphereCache = unique.slice(0, 12);
  _atmosphereExpiry = Date.now() + ATMOSPHERE_TTL_MS;
  return _atmosphereCache;
}

// ---------- Exa enrichment ----------
async function exaEnrich(answers, plan) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return null;

  const career = answers.find((a) => a.category === "future")?.choice || "";
  const strength = answers.find((a) => a.category === "academic_lean")?.choice || "";

  const query = `College programs and outcomes for high school students focused on ${strength} heading toward ${career}`;

  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: 5,
        type: "auto",
        contents: {
          summary: { query: "Programs, outcomes, or pathways for similar students" },
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      query,
      results: (data.results || []).slice(0, 5).map((r) => ({
        title: r.title,
        url: r.url,
        summary: r.summary || r.text?.slice(0, 200),
        publishedDate: r.publishedDate,
      })),
    };
  } catch (e) {
    console.warn("Exa enrichment failed:", e.message);
    return null;
  }
}

// ---------- Public API: orchestration ----------
export async function startJourney(db, userId) {
  const id = (await import("crypto")).randomUUID();
  db.prepare(
    "INSERT INTO journeys (id, user_id, status, answers) VALUES (?, ?, 'in_progress', '[]')"
  ).run(id, userId || null);

  const journey = db.prepare("SELECT * FROM journeys WHERE id = ?").get(id);
  const decision = await selectNextQuestion(db, journey);
  return { journey_id: id, question: pickedQuestionFor(db, decision), progress: { answered: 0, total: TARGET_QUESTIONS } };
}

function pickedQuestionFor(db, decision) {
  if (decision.action === "pick") return getQuestion(db, decision.question_id);
  if (decision.action === "generate") {
    return insertGeneratedQuestion(db, decision.new_question);
  }
  return null;
}

export async function recordAnswer(db, journeyId, { question_id, choice }) {
  const journey = db.prepare("SELECT * FROM journeys WHERE id = ?").get(journeyId);
  if (!journey) throw new Error("Journey not found");

  const question = getQuestion(db, question_id);
  if (!question) throw new Error("Question not found");

  const answers = JSON.parse(journey.answers || "[]");
  answers.push({
    question_id,
    text: question.text,
    options: question.options,
    choice,
    category: question.category,
  });

  bumpQuestionUse(db, question_id);

  db.prepare(
    "UPDATE journeys SET answers = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(answers), journeyId);

  const updated = db.prepare("SELECT * FROM journeys WHERE id = ?").get(journeyId);
  const [decision, preliminary] = await Promise.all([
    selectNextQuestion(db, updated),
    answers.length >= 2 && answers.length < TARGET_QUESTIONS
      ? generatePreliminaryPlan(db, updated)
      : Promise.resolve(null),
  ]);

  if (decision.action === "ready" || answers.length >= TARGET_QUESTIONS) {
    const plan = await generatePlan(db, updated);
    const enrichment = await exaEnrich(answers, plan);
    const title = `${answers[0]?.choice || "Plan"} • ${
      answers.find((a) => a.category === "future")?.choice || "Course Journey"
    }`;
    db.prepare(
      "UPDATE journeys SET status = 'complete', plan = ?, enrichment = ?, title = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(
      JSON.stringify(plan),
      enrichment ? JSON.stringify(enrichment) : null,
      title.slice(0, 80),
      journeyId
    );

    return {
      done: true,
      plan,
      enrichment,
      progress: { answered: answers.length, total: TARGET_QUESTIONS },
    };
  }

  return {
    done: false,
    question: pickedQuestionFor(db, decision),
    preliminary,
    progress: { answered: answers.length, total: TARGET_QUESTIONS },
  };
}

export function getJourney(db, id) {
  const row = db.prepare("SELECT * FROM journeys WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    answers: JSON.parse(row.answers || "[]"),
    plan: row.plan ? JSON.parse(row.plan) : null,
    enrichment: row.enrichment ? JSON.parse(row.enrichment) : null,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listJourneys(db, userId) {
  const rows = db
    .prepare(
      "SELECT id, title, status, created_at, updated_at FROM journeys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20"
    )
    .all(userId);
  return rows;
}
