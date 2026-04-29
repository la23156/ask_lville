# Ask Lville

A RAG chatbot for The Lawrenceville School. Mirrors the Ask Alma architecture, ported to Node + local SQLite.

- **Backend**: Express + better-sqlite3 + sqlite-vec (local vector search)
- **Frontend**: React 18 + Vite + Tailwind
- **LLM/Embeddings**: OpenAI `gpt-4o-mini` and `text-embedding-3-small`
- **Sources indexed**: `lville-course-catalog.pdf`, `StudentHandbook_LawrencevilleSchool.pdf`

## Setup

```bash
# 1. Install all deps (root, server, web)
npm install
npm run install:all

# 2. Make sure .env contains your OpenAI key
#    OPENAI_API_KEY=sk-...

# 3. One-time: parse the PDFs, chunk, embed, store in SQLite
npm run ingest

# 4. Run server (5001) and web (3000) together
npm run dev
```

Open http://localhost:3000.

## Layout

```
ask_lville/
├── .env                 # OPENAI_API_KEY
├── data/lville.db       # SQLite + sqlite-vec store (created by ingest)
├── server/              # Express API
│   ├── index.js         # routes
│   ├── db.js            # SQLite + migrations
│   ├── openai.js        # OpenAI SDK wrapper
│   ├── chunker.js       # sentence-aware chunker
│   ├── ingest.js        # PDF -> chunks -> embeddings -> DB
│   ├── rag.js           # retrieve + generate
│   └── prompts.js
└── web/                 # Vite + React UI
    └── src/
        ├── App.jsx
        ├── components/  # Sidebar, ChatArea, EmptyState, ChatInputBar, ProfileModal
        ├── context/AuthContext.jsx
        ├── services/api.js
        └── data/lvilleData.js
```

## API

- `GET  /api/health`
- `POST /api/chat` — `{ question, conversation_id?, user_id? }`
- `GET  /api/conversations?user_id=`
- `GET  /api/conversations/search?user_id=&query=`
- `GET  /api/conversations/:id`
- `PATCH /api/conversations/:id` — `{ title }`
- `DELETE /api/conversations/:id`
- `GET  /api/profile/:user_id`
- `POST /api/profile`

## Notes

- Auth is intentionally stubbed for the demo — `AuthContext` mints a stable local user id stored in `localStorage`.
- Re-run `npm run ingest` after replacing the PDFs; the vector tables are reset on each run.
