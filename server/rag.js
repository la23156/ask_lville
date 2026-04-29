import { getDb } from "./db.js";
import { embedOne, openai, CHAT_MODEL } from "./openai.js";
import { SYSTEM_PROMPT, buildUserContent } from "./prompts.js";

const TOP_K = 6;
const MAX_CONTEXT_CHARS = 5000;

export async function retrieve(question, k = TOP_K) {
  const db = getDb();
  const qvec = await embedOne(question);
  const buf = Buffer.from(new Float32Array(qvec).buffer);

  const rows = db
    .prepare(
      `SELECT d.id, d.source, d.page, d.content, v.distance
       FROM vec_documents v
       JOIN documents d ON d.id = v.rowid
       WHERE v.embedding MATCH ? AND k = ?
       ORDER BY v.distance ASC`
    )
    .all(buf, k);

  return rows;
}

export async function ragAnswer({ question, history = [], profile = null }) {
  const matches = await retrieve(question);

  let total = 0;
  const trimmed = [];
  for (const m of matches) {
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
    sources: trimmed.map((m) => ({
      id: m.id,
      source: m.source,
      page: m.page,
      similarity: 1 - (m.distance ?? 0),
      preview: m.content.slice(0, 200) + (m.content.length > 200 ? "..." : ""),
    })),
  };
}
