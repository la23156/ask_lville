import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "lville.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let _db = null;

export function getDb() {
  if (_db) return _db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  sqliteVec.load(db);
  migrate(db);
  seedQuestions(db);
  cleanupEmptyJourneys(db);
  _db = db;
  return db;
}

function cleanupEmptyJourneys(db) {
  // Drop in-progress journeys that never received an answer. These accumulate
  // when the user opens the wizard without finishing.
  const info = db
    .prepare(
      "DELETE FROM journeys WHERE status = 'in_progress' AND (answers IS NULL OR answers = '[]' OR LENGTH(TRIM(answers)) <= 2)"
    )
    .run();
  if (info.changes > 0) {
    console.log(`[startup] cleaned up ${info.changes} empty in-progress journeys`);
  }
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY,
      source TEXT NOT NULL,
      page INTEGER,
      content TEXT NOT NULL,
      metadata TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS vec_documents USING vec0(
      embedding float[1536]
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      role TEXT,
      grade TEXT,
      house TEXT,
      interests TEXT,
      classes_taken TEXT,
      profile_image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      text TEXT NOT NULL,
      options TEXT NOT NULL,           -- JSON array of strings
      category TEXT,
      source TEXT DEFAULT 'seed',      -- 'seed' | 'generated'
      active INTEGER DEFAULT 1,
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(active);
    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);

    CREATE TABLE IF NOT EXISTS journeys (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      status TEXT DEFAULT 'in_progress', -- 'in_progress' | 'complete'
      answers TEXT DEFAULT '[]',         -- JSON array of {question_id, text, options, choice}
      plan TEXT,                         -- JSON plan (set when complete)
      enrichment TEXT,                   -- JSON Exa results (optional)
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_journeys_user ON journeys(user_id);

    CREATE TABLE IF NOT EXISTS course_deep_dives (
      journey_id TEXT NOT NULL,
      course_code TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (journey_id, course_code)
    );
  `);
}

const SEED_QUESTIONS = [
  {
    key: "form",
    category: "demographics",
    text: "Which Form will you be in this fall?",
    options: ["II Form (9th)", "III Form (10th)", "IV Form (11th)", "V Form (12th)", "Post-Graduate"],
  },
  {
    key: "strength",
    category: "academic_lean",
    text: "Which subject area excites you the most?",
    options: ["STEM (math, science, computing)", "Humanities (English, history, philosophy)", "World Languages", "Visual & Performing Arts", "I genuinely love it all"],
  },
  {
    key: "math_track",
    category: "math",
    text: "How do you feel about math?",
    options: ["Love it — push me to the highest track", "Strong — want challenging courses", "Solid — comfortable on a regular track", "It's a struggle — want extra support", "I'd avoid it if I could"],
  },
  {
    key: "language",
    category: "language",
    text: "Which language path interests you most?",
    options: ["Latin or Greek (classical)", "Spanish", "French", "Mandarin", "No strong preference / minimum requirement"],
  },
  {
    key: "arts_commitment",
    category: "arts",
    text: "How much room do you want for arts in your schedule?",
    options: ["Major commitment — multiple arts courses", "One arts course per year", "Just meet the graduation requirement", "I'd rather skip arts where possible"],
  },
  {
    key: "athletics",
    category: "athletics",
    text: "What level of athletic commitment do you expect?",
    options: ["Three-season varsity athlete", "Two seasons of competitive sports", "One season + non-team activities", "Required PE only"],
  },
  {
    key: "workload",
    category: "load",
    text: "How rigorous a course load do you want?",
    options: ["Maximum rigor — Honors/AP wherever possible", "Challenging but balanced", "Standard college-prep load", "Lighter — I want time for activities"],
  },
  {
    key: "career_interest",
    category: "future",
    text: "Where do you see yourself heading after Lawrenceville?",
    options: ["Engineering / CS / Tech", "Medicine / Life sciences", "Business / Economics / Finance", "Humanities / Law / Public policy", "Arts / Design / Creative", "Truly undecided"],
  },
  {
    key: "research_interest",
    category: "depth",
    text: "Are you drawn to research or independent study?",
    options: ["Yes — I want capstone / independent work", "Maybe — depends on the topic", "No — I prefer structured courses"],
  },
  {
    key: "learning_style",
    category: "style",
    text: "Which describes how you learn best?",
    options: ["Discussion at the Harkness table", "Hands-on labs and projects", "Reading and writing deeply", "Problem-sets and structured practice"],
  },
  {
    key: "global",
    category: "depth",
    text: "Are you interested in study-away or global programs?",
    options: ["Yes — eager to study abroad", "Maybe, if the timing works", "Probably not"],
  },
  {
    key: "leadership",
    category: "extracurricular",
    text: "How important is leadership / community involvement to you?",
    options: ["Very — I want House and student-government roles", "Important but I'll grow into it", "Modest — I'll show up but not lead", "Not a focus right now"],
  },
];

function seedQuestions(db) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO questions (key, text, options, category, source) VALUES (?, ?, ?, ?, 'seed')"
  );
  const tx = db.transaction((rows) => {
    for (const r of rows) {
      insert.run(r.key, r.text, JSON.stringify(r.options), r.category);
    }
  });
  tx(SEED_QUESTIONS);
}

export function resetVectorTables() {
  const db = getDb();
  db.exec(`DELETE FROM documents; DELETE FROM vec_documents;`);
}
