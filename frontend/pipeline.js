/* ═══════════════════════════════════════════
   PIPELINE.JS — CI/CD animation logic
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── DOM refs ── */
  const sastBar    = document.getElementById('sast-bar');
  const sastTime   = document.getElementById('sast-time');
  const deployBar  = document.getElementById('deploy-bar');
  const logStream  = document.getElementById('log-stream');
  const stageEl    = (id) => document.getElementById(id);

  /* ── Live clock ── */
  function tickClock() {
    const el = document.getElementById('live-time');
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB');
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ── Log lines to drip out ── */
  const PENDING_LOGS = [
    ['log-run',  '    Scanning api/tasks endpoint...'],
    ['log-info', '    No XSS vulnerabilities found'],
    ['log-run',  '    Checking api/sprints endpoint...'],
    ['log-info', '    No SQL injection vectors found'],
    ['log-ok',   '[✓] SAST scan complete — 0 critical'],
    ['log-ok',   '[✓] DAST scan complete — clean'],
    ['log-run',  '[→] Pushing image to registry...'],
    ['log-ok',   '[✓] Image pushed: mohssine/agileai:sha-3f8a2c1'],
    ['log-run',  '[→] ArgoCD: syncing app/agileai...'],
    ['log-info', '    Comparing desired vs live manifests'],
    ['log-ok',   '[✓] Kubernetes rollout complete'],
    ['log-ok',   '[✓] Health check passed — 200 OK'],
    ['log-ok',   '🚀 Deploy successful! Build #47 live.'],
  ];
  let logIdx = 0;

  function addLog(cls, text) {
    const now  = new Date().toLocaleTimeString('en-GB');
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML =
      `<span class="log-time">${now}</span>` +
      `<span class="${cls}">${text}</span>`;
    logStream.appendChild(line);
    logStream.scrollTop = logStream.scrollHeight;
  }

  /* ── Stage status helpers ── */
  function setStageStatus(stageId, status, label) {
    const el = stageEl(stageId);
    if (!el) return;
    el.dataset.status = status;
    const statusEl = el.querySelector('.stage-status');
    if (statusEl) statusEl.innerHTML = `<span class="status-icon">${iconFor(status)}</span> ${label}`;
  }

  function iconFor(status) {
    return { done: '✓', running: '⟳', failed: '✗', wait: '○' }[status] || '○';
  }

  /* ── SAST stage animation ── */
  let sastPct = 60;

  const sastInterval = setInterval(() => {
    sastPct = Math.min(100, sastPct + 4);
    if (sastBar) sastBar.style.width = sastPct + '%';

    const rem = Math.max(0, Math.round((100 - sastPct) * 0.4));
    if (sastTime) sastTime.textContent = rem > 0 ? `~${rem}s remaining` : 'done';

    /* drip a log line every ~2 ticks */
    if (logIdx < PENDING_LOGS.length && sastPct % 8 === 0) {
      addLog(...PENDING_LOGS[logIdx++]);
    }

    if (sastPct >= 100) {
      clearInterval(sastInterval);
      setStageStatus('stage-sast', 'done', 'passed');
      /* flush remaining SAST logs */
      while (logIdx < 6) addLog(...PENDING_LOGS[logIdx++]);
      startDeployStage();
    }
  }, 800);

  /* ── Deploy stage animation ── */
  function startDeployStage() {
    setTimeout(() => {
      setStageStatus('stage-deploy', 'running', 'running');

      let dp = 0;
      const deployInterval = setInterval(() => {
        dp = Math.min(100, dp + 7);
        if (deployBar) deployBar.style.width = dp + '%';

        /* drip deploy logs */
        if (logIdx < PENDING_LOGS.length) {
          addLog(...PENDING_LOGS[logIdx++]);
        }

        if (dp >= 100) {
          clearInterval(deployInterval);
          setStageStatus('stage-deploy', 'done', 'deployed');
          /* update status bar */
          const dot = document.querySelector('.status-dot');
          if (dot) dot.style.background = '#00ffd0';
        }
      }, 350);
    }, 800);
  }

})();
