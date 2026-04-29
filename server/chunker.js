// Sentence-aware chunker, port of ask_alma's data_chunking.py.
// Targets ~2000-3000 chars with ~200 char overlap.

const SENT_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/;

export function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(SENT_SPLIT)
    .filter(Boolean);
}

export function sentenceChunk(text, { minChars = 1500, maxChars = 2800, overlapChars = 200 } = {}) {
  const sentences = splitSentences(text);
  const chunks = [];
  let current = "";

  for (const s of sentences) {
    const parts = s.split(/(,|;)/).map((p) => p.trim()).filter(Boolean);
    for (let part of parts) {
      // Force-split a very long token
      while (part.length > maxChars) {
        chunks.push(part.slice(0, maxChars));
        part = part.slice(maxChars - overlapChars);
      }
      const test = current ? current + " " + part : part;
      if (test.length > maxChars) {
        if (current.length >= minChars) {
          chunks.push(current.trim());
          const tail = current.slice(-overlapChars);
          const firstSpace = tail.indexOf(" ");
          const overlap = firstSpace > 0 ? tail.slice(firstSpace + 1) : tail;
          current = (overlap ? overlap + " " : "") + part;
        } else {
          // Below min: keep accumulating even if we go a bit past max
          current = test;
        }
      } else {
        current = test;
      }
    }
  }

  if (current.trim().length >= minChars) {
    chunks.push(current.trim());
  } else if (current.trim()) {
    if (chunks.length) chunks[chunks.length - 1] += " " + current.trim();
    else chunks.push(current.trim());
  }
  return chunks;
}
