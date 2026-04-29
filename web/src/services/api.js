const API_BASE = ""; // proxied through Vite to localhost:5001

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export const api = {
  health: () => request("/api/health"),
  chat: (body) =>
    request("/api/chat", { method: "POST", body: JSON.stringify(body) }),
  listConversations: (userId) =>
    request(`/api/conversations?user_id=${encodeURIComponent(userId)}`),
  searchConversations: (userId, q) =>
    request(
      `/api/conversations/search?user_id=${encodeURIComponent(
        userId
      )}&query=${encodeURIComponent(q)}`
    ),
  getConversation: (id) => request(`/api/conversations/${id}`),
  renameConversation: (id, title) =>
    request(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  deleteConversation: (id) =>
    request(`/api/conversations/${id}`, { method: "DELETE" }),
  getProfile: (userId) => request(`/api/profile/${encodeURIComponent(userId)}`),
  saveProfile: (profile) =>
    request("/api/profile", {
      method: "POST",
      body: JSON.stringify(profile),
    }),
  startJourney: (userId) =>
    request("/api/journey/start", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
  answerJourney: (id, question_id, choice, user_id) =>
    request("/api/journey/answer", {
      method: "POST",
      body: JSON.stringify({ journey_id: id, question_id, choice, user_id }),
    }),
  getJourney: (id) => request(`/api/journey/${id}`),
  listJourneys: (userId) =>
    request(`/api/journeys?user_id=${encodeURIComponent(userId)}`),
  deleteJourney: (id) =>
    request(`/api/journey/${id}`, { method: "DELETE" }),
  getAtmosphereImages: () => request("/api/journey/atmosphere"),
  getCourseDeepDive: (journeyId, code) =>
    request(`/api/journey/${journeyId}/course/${encodeURIComponent(code)}/deep-dive`),
};
