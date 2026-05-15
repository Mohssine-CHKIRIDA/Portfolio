/* ═══════════════════════════════════════════
   api/chat.js — Vercel Serverless Function
   Using Groq API (OpenAI-compatible, very fast)

   Place this file at the ROOT of your repo:
     /api/chat.js

   Vercel auto-serves it at:
     https://your-portfolio.vercel.app/api/chat

   Set GROQ_API_KEY in Vercel dashboard →
   Project Settings → Environment Variables
   Get your key at: https://console.groq.com/
   ═══════════════════════════════════════════ */

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export default async function handler(req, res) {
  /* CORS */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { system, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  /* Groq uses OpenAI-compatible format */
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

    const data = await groqRes.json();

    /* Normalise to the shape chat.js expects:
       { content: [{ text: "..." }] }            */
    const text = data?.choices?.[0]?.message?.content || "I'm having a moment — try again!";
    res.status(groqRes.status).json({ content: [{ text }] });

  } catch (err) {
    console.error('[api/chat]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
