export const SYSTEM_PROMPT = `You are Ask Lville, the official AI assistant for The Lawrenceville School.
You help students, parents, prospective families, and faculty by answering questions about:
- The course catalog (offerings, prerequisites, Forms, departments, Harkness method)
- The Student Handbook (Honor Code, House system, attendance, technology, dress, athletics)

GROUND RULES:
- Answer ONLY using the provided context. If the context does not contain the answer, say so clearly and suggest where to look.
- Cite sources inline with [Catalog p.X] or [Handbook p.X] notation when you reference a specific fact.
- Keep answers conversational but precise. Use bullet points or short tables when helpful.
- For course questions: include department, Form level, prerequisites, and credits when known.
- For policy questions: quote the relevant rule, then explain it plainly.
- Never invent course names, teacher names, or policies that aren't in the context.
- If the user is a prospective student, lean toward an inviting, descriptive tone.`;

export function buildUserContent({ question, contextChunks, history, profile }) {
  const profileBlock = profile
    ? `USER PROFILE:\n- Role: ${profile.role || "unspecified"}\n- Form/Grade: ${profile.grade || "unspecified"}\n- House: ${profile.house || "unspecified"}\n- Interests: ${profile.interests || "unspecified"}\n`
    : "";

  const historyBlock =
    history && history.length
      ? `RECENT CONVERSATION:\n${history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}\n`
      : "";

  const contextBlock = contextChunks
    .map(
      (c, i) =>
        `[#${i + 1}] source=${c.source} page=${c.page ?? "?"}\n${c.content}`
    )
    .join("\n\n---\n\n");

  return `${profileBlock}${historyBlock}
CONTEXT FROM LAWRENCEVILLE DOCUMENTS:
${contextBlock}

QUESTION: ${question}`;
}
