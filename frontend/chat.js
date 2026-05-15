/* ═══════════════════════════════════════════
   CHAT.JS — AI twin chat UI
   Calls the backend proxy at /api/chat
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  /* ────────────────────────────────────────
     CONFIG
     In production this hits your Vercel/Railway
     proxy. Change to full URL if your backend
     lives on a separate domain.
  ──────────────────────────────────────── */
  const API_URL = (() => {
    const override = window.__CHAT_API_URL__;

    if (typeof override === "string" && override.trim()) {
      return override.trim();
    }

    if (window.location.protocol === "file:") {
      return "http://localhost:3001/api/chat";
    }

    if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
      return "http://localhost:3001/api/chat";
    }

    return "/api/chat";
  })();

  /* ────────────────────────────────────────
     SYSTEM PROMPT — Mohssine's full context
  ──────────────────────────────────────── */
  const SYSTEM_PROMPT = `You are Mohssine CHKIRIDA's AI portfolio assistant.
You speak in first person as Mohssine. Be warm, direct, and human — like a developer in a conversation, not a robot reading bullet points. Keep answers concise (2–4 sentences). Don't invent facts. If you don't know something, say so naturally.

=== BACKGROUND ===

IDENTITY:
- Name: Mohssine CHKIRIDA
- Role: 2nd-year Software Engineering student at INPT (Institut National des Postes et Télécommunications), Rabat, Morocco
- Started engineering cycle: 2024 (ongoing)
- Prepared at CPGE Lycée Ibn Timiya, Marrakech (Math & Physics, 2022–2024)
- Looking for: PFA internship (end-of-study project internship) in software engineering or DevOps

CONTACT:
- Email: mhsnchkirida@gmail.com
- GitHub: github.com/Mohssine-CHKIRIDA
- LinkedIn: linkedin.com/in/mohssine-chkirida-3b318b224
- LeetCode: MhsnCH (leetcode.com/u/Msh_x/)
- Phone: +212 612 942 643

=== EXPERIENCE ===

B2Blink — Software Engineering Intern (2025)
- Improved SmartAlert web platform (smartalert.ma) to align with mobile version
- Optimised UX and implemented OAuth2 + JWT authentication
- Added i18n multilingual support
- Tech: ReactJS, Spring Boot, SCSS, JWT, OAuth2, i18n

=== PROJECTS ===

1. AgileAI (in progress)
   - AI-powered Agile management SaaS platform, inspired by Jira but smarter
   - Combines Scrum, Kanban, and LangGraph AI agents
   - Agents automate task management and recommend sprint actions
   - Tech: React, Spring Boot, PostgreSQL, LangGraph, Gemini API

2. DevOps PoC
   - Full end-to-end CI/CD pipeline on a 3-tier application
   - GitLab CI, Docker, Kubernetes manifests, Argo CD (GitOps), SAST/DAST, pre-commit hooks
   - Hands-on with real security tooling (Trivy, OWASP ZAP, Gitleaks)
   - Link: gitlab.com/mohssine-chkirida-group/travelo.git

3. E-commerce Platform
   - Full-stack e-commerce: product catalogue, cart, secure payments, admin panel
   - TypeScript throughout, clean layered architecture, JWT auth
   - Tech: React, TypeScript, Redux, Node.js, Express, PostgreSQL, JWT
   - Link: github.com/Mohssine-CHKIRIDA/E-commerce_Website

=== TECH STACK ===

Languages: Java, JavaScript, TypeScript, Python
Frontend: React, Next.js, HTML5, CSS3, Tailwind CSS
Backend: Spring Boot, Node.js, Express, REST API, GraphQL, Prisma
Databases: PostgreSQL, MySQL, MongoDB
DevOps: Docker, Docker Compose, Kubernetes/Minikube, GitLab CI/CD, Argo CD, SAST/DAST, pre-commit hooks
Tools: Git, Postman, VS Code, IntelliJ IDEA
AI/ML: LangGraph, Gemini API

=== LANGUAGES SPOKEN ===
Arabic (native), French (fluent), English (B2 — TOEIC), Spanish (beginner)

=== EXTRACURRICULAR (all at INPT, since Oct 2025) ===
- BDE (student union): Committee lead — organises student events and coordinates teams
- Club A2S: HR cell lead — manages members, oversees recruitment and internal organisation
- CIT (Club IT): Web cell co-lead — runs training sessions and organises tech events

=== PERSONALITY / SOFT SKILLS ===
- Analytical thinker from CPGE background
- Hands-on builder who likes combining AI and DevOps
- Proactive leader: leads multiple clubs simultaneously
- Multilingual communicator
- Curious about AI agents, distributed systems, and clean software architecture`;

  /* ────────────────────────────────────────
     STATE
  ──────────────────────────────────────── */
  const conversationHistory = [];
  let isSending = false;

  /* ────────────────────────────────────────
     DOM REFS
  ──────────────────────────────────────── */
  const messagesEl = document.getElementById("chat-messages");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const suggestionsEl = document.getElementById("suggestions");

  /* ────────────────────────────────────────
     RENDER HELPERS
  ──────────────────────────────────────── */
  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = `
      <div class="msg-avatar ${role}">${role === "user" ? "YOU" : "MC"}</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    removeTyping();
    const div = document.createElement("div");
    div.className = "msg ai";
    div.id = "typing-indicator";
    div.innerHTML = `
      <div class="msg-avatar ai">MC</div>
      <div class="msg-bubble">
        <div class="msg-typing">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById("typing-indicator");
    if (t) t.remove();
  }

  function showError(msg) {
    let errorEl = document.getElementById("chat-error-bar");
    if (!errorEl) {
      errorEl = document.createElement("div");
      errorEl.id = "chat-error-bar";
      errorEl.className = "chat-error";
      document.querySelector(".chat-container").appendChild(errorEl);
    }
    errorEl.textContent = msg;
    setTimeout(() => {
      if (errorEl) errorEl.remove();
    }, 5000);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br>");
  }

  /* ────────────────────────────────────────
     API CALL
  ──────────────────────────────────────── */
  async function callProxy(userMessage) {
    conversationHistory.push({ role: "user", content: userMessage });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Server error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const reply =
      data?.content?.[0]?.text || "I'm having a moment — try again!";
    conversationHistory.push({ role: "assistant", content: reply });
    return reply;
  }

  /* ────────────────────────────────────────
     SEND MESSAGE
  ──────────────────────────────────────── */
  async function sendMessage(text) {
    const msg = (text || inputEl.value).trim();
    if (!msg || isSending) return;

    isSending = true;
    inputEl.value = "";
    sendBtn.disabled = true;

    /* hide suggestions after first real message */
    if (suggestionsEl) suggestionsEl.style.display = "none";

    appendMessage("user", msg);
    showTyping();

    try {
      const reply = await callProxy(msg);
      removeTyping();
      appendMessage("ai", reply);
    } catch (err) {
      removeTyping();
      console.error("[chat]", err);
      showError(
        "⚠ Could not reach the AI — is the backend running? Check /api/chat",
      );
      appendMessage(
        "ai",
        "Looks like my brain went offline for a sec. Make sure the backend proxy is running!",
      );
    }

    isSending = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  /* ────────────────────────────────────────
     EVENT LISTENERS
  ──────────────────────────────────────── */
  if (sendBtn) {
    sendBtn.addEventListener("click", () => sendMessage());
  }

  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (suggestionsEl) {
    suggestionsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".suggest-btn");
      if (btn) sendMessage(btn.dataset.msg);
    });
  }
})();
