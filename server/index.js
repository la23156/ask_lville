import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import { getDb } from "./db.js";
import { ragAnswer } from "./rag.js";
import {
  startJourney,
  recordAnswer,
  getJourney,
  listJourneys,
  deleteJourney,
  getAtmosphereImages,
  courseDeepDive,
} from "./journey.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const db = getDb();

app.get("/api/health", (req, res) => {
  const counts = {
    documents: db.prepare("SELECT COUNT(*) AS c FROM documents").get().c,
    conversations: db.prepare("SELECT COUNT(*) AS c FROM conversations").get().c,
  };
  res.json({ status: "ok", message: "Ask Lville API is running", counts });
});

// ---------- CHAT ----------
app.post("/api/chat", async (req, res) => {
  try {
    const { question, conversation_id, user_id } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    let convId = conversation_id;
    if (!convId) {
      convId = uuid();
      db.prepare(
        "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)"
      ).run(convId, user_id || null, question.slice(0, 60));
    }

    const history = db
      .prepare(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 6"
      )
      .all(convId)
      .reverse();

    const profile = user_id
      ? db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(user_id)
      : null;

    const result = await ragAnswer({ question, history, profile });

    db.prepare(
      "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)"
    ).run(convId, question);
    db.prepare(
      "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)"
    ).run(convId, result.answer);
    db.prepare(
      "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?"
    ).run(convId);

    res.json({
      conversation_id: convId,
      answer: result.answer,
      sources: result.sources,
      queries: result.queries,
      model: result.model,
    });
  } catch (e) {
    console.error("chat error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- CONVERSATIONS ----------
app.get("/api/conversations", (req, res) => {
  const { user_id } = req.query;
  const rows = user_id
    ? db
        .prepare(
          `SELECT c.id, c.title, c.updated_at,
                  (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
           FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 50`
        )
        .all(user_id)
    : db
        .prepare(
          `SELECT c.id, c.title, c.updated_at,
                  (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
           FROM conversations c ORDER BY c.updated_at DESC LIMIT 50`
        )
        .all();
  res.json({ conversations: rows });
});

app.get("/api/conversations/search", (req, res) => {
  const { user_id, query } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });
  if (!query || !query.trim()) return res.json({ conversations: [] });
  const pattern = `%${query.trim()}%`;
  const rows = db
    .prepare(
      `SELECT DISTINCT c.id, c.title, c.updated_at,
              (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id) AS message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.user_id = ? AND (c.title LIKE ? OR m.content LIKE ?)
       ORDER BY c.updated_at DESC LIMIT 50`
    )
    .all(user_id, pattern, pattern);
  res.json({ conversations: rows });
});

app.get("/api/conversations/:id", (req, res) => {
  const messages = db
    .prepare(
      "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC"
    )
    .all(req.params.id);
  res.json({ conversation_id: req.params.id, messages });
});

app.patch("/api/conversations/:id", (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim())
    return res.status(400).json({ error: "Title is required" });
  const info = db
    .prepare("UPDATE conversations SET title = ? WHERE id = ?")
    .run(title.trim(), req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: "Conversation not found" });
  res.json({ success: true });
});

app.delete("/api/conversations/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM conversations WHERE id = ?")
    .run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: "Conversation not found" });
  res.json({ success: true });
});

// ---------- PROFILE ----------
app.get("/api/profile/:user_id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
    .get(req.params.user_id);
  if (!row) return res.status(404).json({ error: "Profile not found" });
  row.interests = safeJson(row.interests, []);
  row.classes_taken = safeJson(row.classes_taken, []);
  res.json(row);
});

app.post("/api/profile", (req, res) => {
  const { user_id, role, grade, house, interests, classes_taken, profile_image } =
    req.body || {};
  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  const interestsJson = JSON.stringify(toArray(interests));
  const classesJson = JSON.stringify(toArray(classes_taken));

  db.prepare(
    `INSERT INTO user_profiles (user_id, role, grade, house, interests, classes_taken, profile_image)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
        role = excluded.role,
        grade = excluded.grade,
        house = excluded.house,
        interests = excluded.interests,
        classes_taken = excluded.classes_taken,
        profile_image = excluded.profile_image,
        updated_at = datetime('now')`
  ).run(
    user_id,
    role || null,
    grade || null,
    house || null,
    interestsJson,
    classesJson,
    profile_image || null
  );

  const row = db
    .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
    .get(user_id);
  row.interests = safeJson(row.interests, []);
  row.classes_taken = safeJson(row.classes_taken, []);
  res.json(row);
});

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string")
    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  return [];
}

function safeJson(s, fallback) {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

// ---------- JOURNEY ----------
app.get("/api/journey/atmosphere", async (req, res) => {
  try {
    const images = await getAtmosphereImages();
    res.json({ images });
  } catch (e) {
    console.error("atmosphere:", e);
    res.json({ images: [] });
  }
});

app.post("/api/journey/start", async (req, res) => {
  try {
    const { user_id } = req.body || {};
    const result = await startJourney(db, user_id);
    res.json(result);
  } catch (e) {
    console.error("journey start:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/journey/answer", async (req, res) => {
  try {
    const { journey_id, question_id, choice, user_id } = req.body || {};
    if (!question_id || !choice) {
      return res
        .status(400)
        .json({ error: "question_id and choice are required" });
    }
    const result = await recordAnswer(db, journey_id || null, {
      question_id,
      choice,
      user_id,
    });
    res.json(result);
  } catch (e) {
    console.error("journey answer:", e);
    res.status(500).json({ error: e.message });
  }
});

// Backwards-compatible alias for the old URL pattern.
app.post("/api/journey/:id/answer", async (req, res) => {
  try {
    const { question_id, choice, user_id } = req.body || {};
    if (!question_id || !choice) {
      return res
        .status(400)
        .json({ error: "question_id and choice are required" });
    }
    const result = await recordAnswer(db, req.params.id, {
      question_id,
      choice,
      user_id,
    });
    res.json(result);
  } catch (e) {
    console.error("journey answer:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/journey/:id", (req, res) => {
  const journey = getJourney(db, req.params.id);
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  res.json(journey);
});

app.get("/api/journey/:id/course/:code/deep-dive", async (req, res) => {
  try {
    const data = await courseDeepDive(db, req.params.id, req.params.code);
    res.json(data);
  } catch (e) {
    console.error("course deep-dive:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/journeys", (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });
  res.json({ journeys: listJourneys(db, user_id) });
});

app.delete("/api/journey/:id", (req, res) => {
  const ok = deleteJourney(db, req.params.id);
  if (!ok) return res.status(404).json({ error: "Journey not found" });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\n🎓 Ask Lville API listening on http://localhost:${PORT}\n`);
});
