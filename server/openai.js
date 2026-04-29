import OpenAI from "openai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY missing from .env");
}
// EXA_API_KEY is optional — Exa enrichment becomes a no-op if absent.

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const EMBED_MODEL = "text-embedding-3-small";
export const CHAT_MODEL = "gpt-4o-mini";

export async function embed(texts) {
  const input = Array.isArray(texts) ? texts : [texts];
  const res = await openai.embeddings.create({ model: EMBED_MODEL, input });
  return res.data.map((d) => d.embedding);
}

export async function embedOne(text) {
  const [v] = await embed([text]);
  return v;
}
