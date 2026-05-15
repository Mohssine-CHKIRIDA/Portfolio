/* ═══════════════════════════════════════════
   SERVER.JS — Backend proxy using Groq API
   Fast LPU inference — free tier available at
   https://console.groq.com/

   Local dev:  node server.js
   Railway:    auto-detected, set PORT env var
   Render:     same
   ═══════════════════════════════════════════ */

import express from 'express';
import cors    from 'cors';
import 'dotenv/config';

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware ── */
app.use(express.json());

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5500';
app.use(cors({ origin: ALLOWED_ORIGIN }));

/* ── Guard ── */
if (!process.env.GROQ_API_KEY) {
  console.error('[server] ❌  GROQ_API_KEY not set. Create a .env file.');
  process.exit(1);
}

/* ── Model — change freely, all are fast on Groq ──
   Recommended options:
   - llama-3.3-70b-versatile   ← best quality, still very fast
   - llama-3.1-8b-instant      ← fastest, great for chat
   - mixtral-8x7b-32768        ← good balance
   ─────────────────────────────────────────────── */
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/* ════════════════════════════════════════════
   POST /api/chat
   Body: { system: string, messages: Message[] }
════════════════════════════════════════════ */
app.post('/api/chat', async (req, res) => {
  const { system, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  /* Groq uses OpenAI-compatible format.
     Prepend system message as a system role entry. */
  const groqMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages,
  ];

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        max_tokens:  1000,
        temperature: 0.7,
        messages:    groqMessages,
      }),
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error('[server] Groq API error:', errorText);
      return res.status(groqRes.status).json({ error: errorText });
    }

    const data = await groqRes.json();

    /* Normalise to the shape chat.js expects:
       { content: [{ text: "..." }] }            */
    const text = data?.choices?.[0]?.message?.content || "I'm having a moment — try again!";
    res.json({ content: [{ text }] });

  } catch (err) {
    console.error('[server] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ── Health check ── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: GROQ_MODEL, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[server] ✅  Groq proxy running at http://localhost:${PORT}`);
  console.log(`[server]     Model: ${GROQ_MODEL}`);
  console.log(`[server]     POST /api/chat → Groq API`);
});
