# Mohssine CHKIRIDA — Portfolio

AI-powered · Git-driven · DevOps themed

---

## Project Structure

```
portfolio/
├── frontend/
│   ├── index.html      ← structure only
│   ├── style.css       ← all visual styles
│   ├── chat.js         ← AI chat UI + calls /api/chat
│   └── pipeline.js     ← CI/CD animation
└── backend/
    ├── server.js        ← Express proxy (local / Railway / Render)
    ├── api/
    │   └── chat.js      ← Vercel serverless function
    ├── package.json
    └── .env.example     ← copy to .env
```

---

## Local Development

### 1. Get an Groq API key

Go to https://console.groq.com/ → API Keys → Create key.

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env and paste your GROQ_API_KEY
npm install
npm run dev
# Server running at http://localhost:3001
```

### 3. Serve the frontend

Use VS Code Live Server, or any static file server:

```bash
cd frontend
npx serve .
# or: python3 -m http.server 5500
```

Open http://localhost:5500 — the chat will call http://localhost:3001/api/chat on local `localhost` sessions.

> **Note:** `chat.js` now auto-switches to `http://localhost:3001/api/chat` when opened from `localhost`, `127.0.0.1`, or `file://`.
> In production it keeps using `/api/chat` so the same code works on Vercel.

---

## Deploy to Vercel (recommended — one repo, zero extra infra)

Vercel runs `api/chat.js` as a serverless function automatically.

```
your-repo/
├── index.html        ← move frontend files to root
├── style.css
├── chat.js
├── pipeline.js
└── api/
    └── chat.js       ← copy from backend/api/chat.js
```

Steps:

1. Push to GitHub
2. Import repo at vercel.com
3. Go to Project Settings → Environment Variables
4. Add `GROQ_API_KEY` = your key
5. Deploy — chat works at `https://your-portfolio.vercel.app/api/chat`

The relative URL `/api/chat` in `chat.js` resolves automatically on Vercel.

---

## Deploy backend to Railway or Render

Both support Node.js out of the box.

1. Create new project, connect your GitHub repo (point to `/backend`)
2. Set environment variables:
   - `GROQ_API_KEY`
   - `FRONTEND_URL` = your Vercel/Netlify URL
3. Start command: `npm start`
4. Update `API_URL` in `chat.js` to your Railway/Render URL:
   ```js
   const API_URL = "https://your-backend.up.railway.app/api/chat";
   ```

---

## Security notes

- The API key **never touches the browser** — it lives in `.env` on the server only
- Add `.env` to `.gitignore` immediately
- The Express server has CORS restricted to your frontend URL
- Rate limiting can be added with `express-rate-limit` if needed
