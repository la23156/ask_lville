import { getDb } from "./db.js";
import { embed, openai, CHAT_MODEL } from "./openai.js";
import { SYSTEM_PROMPT, buildUserContent } from "./prompts.js";

const PER_QUERY_K = 6;        // chunks retrieved per individual query
const FINAL_K = 10;           // chunks kept after fusion
const MAX_CONTEXT_CHARS = 7000;
const RRF_K = 60;             // reciprocal rank fusion constant
const N_VARIANTS = 3;         // alternate queries to generate

const VARIANT_SYSTEM = `You expand a user question into search queries for a vector database holding chunks from The Lawrenceville School's course catalog and student handbook.
Output ONLY a JSON array of ${N_VARIANTS} alternative search queries.
Each query should approach the question from a different angle:
  - one specific (named courses, course codes, policy names, terminology)
  - one synonym/paraphrase
  - one broader category framing
Do NOT include the original question. No prose, no markdown, no explanations — just the JSON array.`;

async function generateQueryVariants(question) {
  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        { role: "system", content: VARIANT_SYSTEM },
        { role: "user", content: question },
      ],
    });
    const text = completion.choices[0]?.message?.content || "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr)
      ? arr.filter((s) => typeof s === "string" && s.trim()).slice(0, N_VARIANTS)
      : [];
  } catch (e) {
    console.warn("query variant generation failed:", e.message);
    return [];
  }
}

function vecParam(arr) {
  return Buffer.from(new Float32Array(arr).buffer);
}

function knnForVector(db, vec, k) {
  return db
    .prepare(
      `SELECT d.id, d.source, d.page, d.content, v.distance
       FROM vec_documents v
       JOIN documents d ON d.id = v.rowid
       WHERE v.embedding MATCH ? AND k = ?
       ORDER BY v.distance ASC`
    )
    .all(vecParam(vec), k);
}

export async function multiQueryRetrieve(question) {
  const db = getDb();
  const variants = await generateQueryVariants(question);
  const allQueries = [question, ...variants];

  const vectors = await embed(allQueries);
  const rankings = vectors.map((v) => knnForVector(db, v, PER_QUERY_K));

  // Reciprocal Rank Fusion
  const scores = new Map();
  const docs = new Map();
  for (const ranked of rankings) {
    ranked.forEach((d, idx) => {
      const score = 1 / (RRF_K + idx + 1);
      scores.set(d.id, (scores.get(d.id) || 0) + score);
      if (!docs.has(d.id)) docs.set(d.id, d);
    });
  }

  const fused = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, FINAL_K)
    .map(([id, score]) => ({ ...docs.get(id), rrf_score: score }));

  return { fused, allQueries };
}

export async function ragAnswer({ question, history = [], profile = null }) {
  const { fused, allQueries } = await multiQueryRetrieve(question);

  let total = 0;
  const trimmed = [];
  for (const m of fused) {
    if (total + m.content.length > MAX_CONTEXT_CHARS) break;
    trimmed.push(m);
    total += m.content.length;
  }

  const userContent = buildUserContent({
    question,
    contextChunks: trimmed,
    history,
    profile,
  });

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim() || "";

  return {
    answer,
    model: CHAT_MODEL,
    queries: allQueries,
    sources: trimmed.map((m) => ({
      id: m.id,
      source: m.source,
      page: m.page,
      score: m.rrf_score,
      preview: m.content.slice(0, 200) + (m.content.length > 200 ? "..." : ""),
    })),
  };
}
