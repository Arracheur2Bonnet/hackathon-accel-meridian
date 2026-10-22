/*
 * App controller: state, routing, event handling. Views are pure (js/views.js);
 * all data comes through App.api (js/services/api.js).
 */
(function (App) {
  const api = App.api, V = App.views;
  const $ = (id) => document.getElementById(id);
  const VIEWS = ['home', 'investigation', 'plan', 'ontology', 'analytics', 'audit', 'evaluation'];
  const PRIMARY = 'SPV-0193';

  let S = null;
  let timers = [];
  let runToken = 0; // survives reset so stale async callbacks are ignored

  function initial(base) {
    const cs = {};
    base.caseList.forEach((c) => {
      const included = Object.fromEntries(c.changes.map((x) => [x.id, true]));
      cs[c.id] = c.id === PRIMARY
        ? { status: 'pending', revealed: 0, included, decision: null }
        : { status: 'awaiting', revealed: c.steps.length, included, decision: null };
    });
    return {
      ...base, view: 'home', caseId: base.caseList.find((c) => c.id !== PRIMARY).id, cs, now: base.ctx.meta.now,
      inv: { sel: {}, replay: null },
      ont: { tab: 'graph', node: null, ent: null, traversal: -1, playing: false, showPath: true },
      audit: [], auditOpen: null, chat: { messages: [], pending: false, draft: '' },
      evalData: api.loadEvaluation(), modal: null, fresh: new Set(),
    };
  }

  function render() {
    // keep focus and caret across re-renders triggered by background work
    const ae = document.activeElement, fid = ae && ae.id, sel = fid && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
    $('nav').innerHTML = V.nav(S);
    $('appbar').innerHTML = V.appbar(S);
    $('statusbar').innerHTML = V.statusbar(S);
    $('view').className = 'content v-' + S.view;
    $('view').innerHTML = V[S.view](S);
    $('layer').innerHTML = V.modal(S);
    if (fid && $(fid)) { const el = $(fid); el.focus(); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text field */ } }
    S.fresh.clear(); // entrance motion plays once
  }

  function go(view) {
    if (!VIEWS.includes(view)) view = 'home';
    if (S.view !== view) {
      clearTimers(); S.inv.replay = null; S.ont.playing = false; // UI replays stop when you leave their screen
      S.view = view; window.scrollTo(0, 0);
    }
    if (location.hash.slice(1) !== view) history.pushState(null, '', '#' + view);
    render();
  }

  const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach((t) => clearInterval(t)); timers = []; };

  /* ---------- Proactive detection (a demo control delivers the event) ---------- */
  async function inject(caseId) {
    const c = S.caseList.find((x) => x.id === caseId), st = S.cs[caseId];
    if (st.status !== 'pending') return;
    const token = ++runToken;
    st.status = 'investigating'; st.revealed = 0;
    S.now = c.detectedAt; S.caseId = caseId;
    S.fresh.add('lead-' + caseId); S.fresh.add('evt');
    render();
    toast(`${c.records.specNew.file} arrived. The agent opened ${caseId}.`);
    await api.detect(caseId, {
      onStep: (i, phase) => {
        if (token !== runToken) return;
        if (phase === 'done') st.revealed = i + 1;
        if (S.view === 'investigation' && S.caseId === caseId && phase === 'done') { S.inv.sel[caseId] = i; S.fresh.add('step'); }
        render();
      },
    });
    if (token !== runToken) return;
    st.status = 'awaiting';
    render();
    toast(`${caseId}: plan ready for review`);
  }

  /* ---------- Investigation replay (UI only, does not change the case) ---------- */
  function replay() {
    const c = S.caseList.find((x) => x.id === S.caseId);
    clearTimers();
    S.inv.replay = { caseId: c.id, n: 0 };
    render();
    every(() => {
      const r = S.inv.replay;
      if (!r) { clearTimers(); return; }
      r.n += 1; S.inv.sel[c.id] = r.n - 1; S.fresh.add('step');
      if (r.n >= c.steps.length) { S.inv.replay = null; clearTimers(); }
      render();
    }, App.config.stepDelayMs);
  }

  /* ---------- Schema traversal replay ---------- */
  function traverse() {
    const c = S.caseList.find((x) => x.id === S.caseId);
    clearTimers();
    S.ont.playing = true; S.ont.showPath = true; S.ont.traversal = 0;
    render();
    every(() => {
      if (S.ont.traversal < c.steps.length - 2) { S.ont.traversal += 1; render(); return; }
      S.ont.playing = false; clearTimers(); render();
    }, 1100);
  }

  /* ---------- Decisions ---------- */
  async function decide(payload) {
    const caseId = S.modal.caseId;
    S.modal = null; render();
    try {
      const rec = await api.decide(caseId, payload);
      const st = S.cs[caseId];
      st.decision = rec; st.status = rec.decision; S.now = rec.at;
      S.audit.unshift(rec); S.fresh.add('audit');
      render(); window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(rec.decision === 'rejected' ? `${caseId} rejected. Reason saved as feedback.` : `${caseId}: ${rec.accepted} of ${rec.proposed} changes approved (demo)`);
    } catch (err) { toast('Decision failed: ' + err.message, true); }
  }

  /* ---------- Analyst ---------- */
  let chatEpoch = 0;
  async function ask(text) {
    text = (text || '').trim();
    if (!text || S.chat.pending) return;
    const epoch = chatEpoch;
    S.chat.messages.forEach((m) => { m.fresh = false; });
    S.chat.messages.push({ role: 'user', text });
    S.chat.pending = true; S.chat.draft = '';
    render(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    try {
      const r = await api.queryAnalytics(text);
      if (epoch !== chatEpoch) return;
      S.chat.messages.push({ role: 'ai', r, fresh: true });
    } catch (err) {
      if (epoch !== chatEpoch) return;
      S.chat.messages.push({ role: 'ai', r: { kind: 'unsupported', text: 'Request failed: ' + err.message } });
    }
    S.chat.pending = false;
    if (S.view === 'analytics') {
      render();
      const all = document.querySelectorAll('.msg-user'), el = all[all.length - 1];
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    }
  }

  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function reset() {
    clearTimers(); runToken++; chatEpoch++;
    await api.reset();
    S = initial({ ctx: S.ctx, caseList: S.caseList });
    window.scrollTo(0, 0);
    go('home');
    toast('Demo reset');
  }

  let toastTimer;
  function toast(msg, isError) {
    clearTimeout(toastTimer);
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' err' : ''); el.setAttribute('role', 'status');
    el.innerHTML = `<svg class="icon sm"><use href="#i-${isError ? 'alert' : 'check'}"/></svg>`;
    el.appendChild(document.createTextNode(msg));
    document.body.appendChild(el);
    toastTimer = setTimeout(() => el.remove(), isError ? 5000 : 2800);
  }

  /* ---------- Events (delegated) ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t || !S) return;
    if (t.classList.contains('overlay') && e.target !== t) return; // clicks inside the modal
    const a = t.dataset.action, cs = S.cs[S.caseId];
    switch (a) {
      case 'nav': go(t.dataset.view); break;
      case 'open-case': S.caseId = t.dataset.case; if (t.dataset.view === 'ontology') { S.ont.tab = 'graph'; S.ont.node = null; } go(t.dataset.view); break;
      case 'pick-case': S.caseId = t.dataset.case; S.ont.node = null; S.ont.traversal = -1; render(); break;
      case 'inject': inject(t.dataset.case); break;
      case 'pick-step': S.inv.sel[S.caseId] = +t.dataset.i; S.fresh.add('step'); render(); break;
      case 'replay': replay(); break;
      case 'schema-from-step': clearTimers(); S.ont.tab = 'schema'; S.ont.traversal = +t.dataset.i; S.ont.showPath = true; S.ont.playing = false; go('ontology'); break;
      case 'toggle-change': cs.included[t.dataset.id] = !cs.included[t.dataset.id]; render(); break;
      case 'approve-open': S.modal = { type: 'approve', caseId: S.caseId }; render(); break;
      case 'reject-open': S.modal = { type: 'reject', caseId: S.caseId }; render(); setTimeout(() => { const ta = $('reject-text'); if (ta) ta.focus(); }, 50); break;
      case 'modal-close': S.modal = null; render(); break;
      case 'approve-confirm': { const inc = S.cs[S.modal.caseId].included; const note = $('exclude-text') ? $('exclude-text').value.trim() : ''; decide({ decision: 'approve', changeIds: Object.keys(inc).filter((k) => inc[k]), reasonCode: note ? 'excluded-changes' : null, reasonText: note }); break; }
      case 'gnode': S.ont.node = S.ont.node === t.dataset.node ? null : t.dataset.node; render(); break;
      case 'gnode-clear': S.ont.node = null; render(); break;
      case 'ont-tab': clearTimers(); S.ont.tab = t.dataset.tab; S.ont.traversal = -1; S.ont.playing = false; render(); break;
      case 'erent': S.ont.ent = S.ont.ent === t.dataset.ent ? null : t.dataset.ent; render(); break;
      case 'toggle-path': S.ont.showPath = !S.ont.showPath; S.ont.traversal = -1; render(); break;
      case 'schema-path': S.caseId = t.dataset.case; S.ont.showPath = true; S.ont.traversal = -1; render(); break;
      case 'traverse': traverse(); break;
      case 'audit-row': S.auditOpen = S.auditOpen === t.dataset.key ? null : t.dataset.key; render(); break;
      case 'export-feedback': download('meridian-feedback-signals.json', [...S.audit, ...S.ctx.seededAudit].map(V.signalOf)); toast('Feedback exported'); break;
      case 'export-eval': download('meridian-evaluation.json', { note: 'Values entered by hand. Empty means not measured.', results: S.evalData }); toast('Evaluation exported'); break;
      case 'suggest': ask(V.SUGGESTIONS[+t.dataset.i]); break;
      case 'chat-clear': chatEpoch++; S.chat = { messages: [], pending: false, draft: '' }; render(); break;
      case 'reset': reset(); break;
      default: break;
    }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.dataset.action === 'ask-form') { e.preventDefault(); ask($('ask').value); }
    if (f.dataset.action === 'reject-form') {
      e.preventDefault();
      const text = $('reject-text').value.trim();
      if (text.length < 5) { $('reject-err').hidden = false; $('reject-text').focus(); return; }
      decide({ decision: 'rejected', changeIds: [], reasonCode: f.querySelector('input[name=reason]:checked').value, reasonText: text });
    }
  });
  document.addEventListener('input', (e) => {
    if (!S) return;
    if (e.target.id === 'ask') S.chat.draft = e.target.value;
    if (e.target.classList.contains('eval-in')) { S.evalData[e.target.dataset.key] = e.target.value; api.saveEvaluation(S.evalData); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S && S.modal) { S.modal = null; render(); }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[data-action][tabindex]')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  window.addEventListener('hashchange', () => { if (S) go(location.hash.slice(1)); });

  /* ---------- Boot ---------- */
  async function boot() {
    try {
      const [ctx, caseList] = await Promise.all([api.getContext(), api.listCases()]);
      S = initial({ ctx, caseList });
      const v = location.hash.slice(1);
      S.view = VIEWS.includes(v) ? v : 'home';
      history.replaceState(null, '', '#' + S.view);
      render();
    } catch (err) {
      $('view').innerHTML = `<div class="banner critical"><div class="body"><h2>Could not load data (${api.mode} mode)</h2><p>${String(err.message).replace(/</g, '&lt;')}</p></div></div>`;
      console.error(err);
    }
  }
  boot();
})(window.App = window.App || {});
