/*
 * Views: pure functions (state → HTML). All figures come from case objects
 * built by js/supervision.js, or from the context returned by the service.
 */
(function (App) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = '') => `<svg class="icon ${cls}"><use href="#i-${n}"/></svg>`;
  const MARK_ICON = { critical: 'alert', warning: 'clock', success: 'check', info: 'info', ai: 'radar' };
  const tag = (tone, text, ic) => { const i = ic || MARK_ICON[tone]; return `<span class="tag ${tone}">${i ? icon(i) : ''}${esc(text)}</span>`; };
  const count = (n) => `<span class="count">${n}</span>`;
  const hhmm = (iso) => iso.slice(11, 16);
  const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  const APPS = {
    home: { name: 'Supervision', icon: 'radar', color: '#2D72D2' },
    investigation: { name: 'Investigations', icon: 'agent', color: '#6E56CF' },
    plan: { name: 'Action plans', icon: 'list', color: '#238551' },
    ontology: { name: 'Ontology', icon: 'cube', color: '#2D72D2' },
    audit: { name: 'Audit and feedback', icon: 'history', color: '#404854' },
    analytics: { name: 'Ops Analyst', icon: 'chart', color: '#C87619' },
    evaluation: { name: 'Evaluation', icon: 'scale', color: '#5F6B7C' },
  };
  const appIco = (v) => `<span class="app-ico">${icon(APPS[v].icon)}</span>`;
  const STATUS = {
    pending: ['', 'Not detected yet'], investigating: ['ai', 'Investigating'], awaiting: ['warning', 'Awaiting decision'],
    approved: ['success', 'Approved (demo)'], partial: ['success', 'Partly approved (demo)'], rejected: ['critical', 'Rejected'],
  };
  const statusTag = (st) => tag(STATUS[st][0], STATUS[st][1], st === 'approved' || st === 'partial' ? 'check' : null);
  const isClosed = (st) => ['approved', 'partial', 'rejected'].includes(st);
  const getCase = (S, cid) => S.caseList.find((c) => c.id === cid);
  const visibleCases = (S) => S.caseList.filter((c) => S.cs[c.id].status !== 'pending');
  const algNames = (S) => Object.fromEntries(S.ctx.allergens.map((a) => [a.code, a.name]));
  const rule = (S, rid) => S.ctx.rules[rid];
  const REASONS = {
    'wrong-record': 'Wrong records identified', 'wrong-correction': 'Proposed correction is wrong', 'missing-impact': 'Impact is incomplete',
    'false-positive': 'Not a real discrepancy', 'needs-evidence': 'Needs more evidence', other: 'Other',
    'excluded-changes': 'Changes excluded on approval',
  };

  /* ================= Shell ================= */
  function nav(S) {
    const item = (view, label, ic, extra = '') => `<button class="nav-item ${S.view === view ? 'active' : ''}" data-action="nav" data-view="${view}" title="${label}">${ic}<span class="lbl">${label}</span>${extra}</button>`;
    const awaiting = visibleCases(S).filter((c) => S.cs[c.id].status === 'awaiting').length;
    return `<div class="gnav-group">${item('home', 'Supervision', icon('radar'), awaiting ? `<i class="nav-count">${awaiting}</i>` : '')}${item('ontology', 'Ontology', icon('cube'))}</div>
      <div class="gnav-group"><div class="gnav-label">Applications</div>
        ${item('investigation', 'Investigations', appIco('investigation'))}${item('plan', 'Action plans', appIco('plan'))}${item('analytics', 'Ops Analyst', appIco('analytics'))}</div>
      <div class="gnav-group"><div class="gnav-label">Learning loop</div>
        ${item('audit', 'Audit and feedback', appIco('audit'))}${item('evaluation', 'Evaluation', appIco('evaluation'))}</div>
      <div class="gnav-group" style="border-bottom:0"><div class="gnav-label">Files</div><div class="gnav-file">${icon('layers')}<span>Kumo, Paris kitchen</span></div></div>`;
  }

  function caseSwitch(S) {
    return `<div class="seg-ctl" role="tablist">${visibleCases(S).map((c) => `<button role="tab" class="${S.caseId === c.id ? 'on' : ''}" data-action="pick-case" data-case="${c.id}"><i class="sev ${c.severity.toLowerCase()}"></i>${c.id}</button>`).join('')}</div>`;
  }

  function appbar(S) {
    const casey = ['investigation', 'plan', 'ontology'].includes(S.view) && !(S.view === 'ontology' && S.ont.tab === 'schema');
    return `<div class="tile">${appIco(S.view)}</div><div class="name">${APPS[S.view].name}</div><span class="tag plain">${App.api.mode === 'demo' ? 'Demo data' : 'Backend'}</span>
      <div class="spacer"></div><div class="right">${casey ? caseSwitch(S) : ''}<span class="clock">${icon('clock', 'sm')}Demo clock ${day(S.ctx.meta.now)}, ${hhmm(S.now)}</span></div>`;
  }

  function statusbar(S) {
    const watched = S.ctx.streams.filter((s) => s.state === 'watched').length;
    const vc = visibleCases(S);
    const awaiting = vc.filter((c) => S.cs[c.id].status === 'awaiting').length;
    const running = vc.filter((c) => S.cs[c.id].status === 'investigating').length;
    return `<span class="seg">${icon('radar')}Supervision scan every 15 min (simulated)</span><span class="seg hide-sm">${watched} streams watched, snapshot data</span>
      <span class="spacer"></span><span class="light">${running ? `<span class="spinner dark"></span>${running} investigating` : `${icon('info')}${awaiting} plan${awaiting === 1 ? '' : 's'} awaiting decision`}</span>`;
  }

  /* ================= Home: supervision control center ================= */
  const lineageOf = (c) => (c.scenario === 'allergen'
    ? [['Spec', 'v2 → v3'], ['Ingredient', 1], ['Sub-recipe', 1], ['Recipes', c.impact.productsLinked], ['Products', c.impact.products], ['Sheets', c.impact.sheets], ['Lots to hold', c.impact.lots]]
    : [['Ordered', `${c.records.po.qtyKg} kg`], ['Received', `${c.records.grn.qtyKg} kg`], ['Available', `${c.available} kg`], ['Runs', c.impact.runs], ['Short', `${c.deficit} kg`], ['Orders at risk', c.impact.atRisk]]);

  function leadCase(S, c) {
    const st = S.cs[c.id];
    const live = st.status === 'investigating';
    const complete = st.revealed >= c.steps.length;
    const stages = [['Detected', true], ['Investigated', complete], ['Plan ready', complete], ['Decision', isClosed(st.status)]];
    const chain = lineageOf(c);
    const body = live
      ? `<ol class="mini-trace">${c.steps.map((s, i) => `<li class="${i < st.revealed ? 'done' : i === st.revealed ? 'run' : ''}"><span>${i < st.revealed ? icon('check', 'sm') : i + 1}</span>${esc(s.title)}</li>`).join('')}</ol>`
      : c.scenario === 'allergen'
        ? `<div class="lead-body"><div class="figs3">${[['Products', c.impact.products], ['Product sheets', c.impact.sheets], ['Lots to hold', `${c.impact.lots}`]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>
          <div class="sesame-col" aria-label="Sesame declared per product"><div class="sc-h">Declares sesame?</div>${c.matrix.map((m) => `<div class="sc-row"><span>${esc(m.name)}</span><i class="${m.missing.length ? 'no' : 'yes'}">${m.missing.length ? '!' : '●'}</i></div>`).join('')}</div></div>`
        : `<div class="chain" aria-label="Downstream impact">${chain.map(([k, v], i) => `${i ? `<span class="chain-arrow">${icon('chev', 'sm')}</span>` : ''}<span class="chain-item ${i >= chain.length - 3 ? 'hot' : ''}"><b>${esc(v)}</b>${esc(k)}</span>`).join('')}</div>`;
    return `<article class="lead sev-${c.severity.toLowerCase()} ${S.fresh.has('lead-' + c.id) ? 'arrive' : ''}">
      <div class="lead-top"><span class="sev-label ${c.severity.toLowerCase()}">${icon('alert', 'sm')}${esc(c.severity)}, ${esc(c.category.toLowerCase())}</span>${statusTag(st.status)}<span class="lead-id">${c.id}</span><span class="lead-when">${icon('radar', 'sm')}Opened by the agent at ${hhmm(c.detectedAt)}, without a request</span></div>
      <h2>${esc(c.title)}</h2>
      <p class="lead-head">${live ? `${esc(c.trigger)}. The agent is checking it against stored records (replayed at demo speed); findings appear when the trace completes.` : esc(c.headline)}</p>
      ${body}
      <div class="lead-foot"><div class="stages">${stages.map(([k, on]) => `<span class="${on ? 'on' : ''}">${icon(on ? 'check' : 'clock', 'sm')}${k}</span>`).join('')}</div>
        ${c.deadline && !isClosed(st.status) ? `<span class="deadline">${icon('clock', 'sm')}${esc(c.deadline)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn ${live ? 'primary' : 'minimal'}" data-action="open-case" data-case="${c.id}" data-view="investigation">${live ? 'Watch the investigation' : 'See how the agent got there'}</button>
        ${!live ? `<button class="btn primary" data-action="open-case" data-case="${c.id}" data-view="plan">${isClosed(st.status) ? 'View decision' : 'Review plan'}</button>` : ''}</div>
    </article>`;
  }

  function home(S) {
    const vc = visibleCases(S);
    const order = { Critical: 0, High: 1 };
    const open = vc.filter((c) => !isClosed(S.cs[c.id].status)).sort((a, b) => order[a.severity] - order[b.severity]);
    const closed = vc.filter((c) => isClosed(S.cs[c.id].status));
    const lead = open[0];
    const pendingCase = S.caseList.find((c) => S.cs[c.id].status === 'pending');
    const events = S.ctx.events.filter((e) => !e.injected || S.cs[e.case].status !== 'pending').slice().reverse();
    const allDecisions = [...S.audit, ...S.ctx.seededAudit];
    const resTag = { match: tag('success', 'Matches'), 'no impact': tag('', 'No impact'), linked: tag('', 'Linked to a case', 'link'), escalated: tag('critical', 'Escalated') };
    const evs = events.map((e) => `<li class="${e.result === 'escalated' ? 'esc' : ''} ${e.injected && S.fresh.has('evt') ? 'arrive' : ''}"><span class="t">${hhmm(e.at)}</span><div>${esc(e.text)}<div class="ev-src">${esc(S.ctx.streams.find((s) => s.id === e.stream).name)}</div></div><div class="ev-res">${resTag[e.result]}${e.case ? `<button class="link" data-action="open-case" data-case="${e.case}" data-view="investigation">${e.case}</button>` : ''}</div></li>`).join('');
    const streams = S.ctx.streams.map((s) => `<tr class="${s.state === 'proposed' ? 'muted-row' : ''}"><td><b>${esc(s.name)}</b><div class="xs muted">${esc(s.source)}</div></td><td>${esc(s.watches)}</td><td>${s.rules.length ? s.rules.map((r) => `<span class="ruleid" title="${esc(rule(S, r).text)}">${r}</span>`).join(' ') : '—'}</td><td>${s.state === 'proposed' ? 'Proposed, not connected' : 'Watched (snapshot)'}</td></tr>`).join('');
    const counts = { events: events.length, escalated: events.filter((e) => e.result === 'escalated').length, running: vc.filter((c) => S.cs[c.id].status === 'investigating').length, awaiting: vc.filter((c) => S.cs[c.id].status === 'awaiting').length, decisions: allDecisions.length };
    const sub = `${counts.events} events checked today. ${counts.escalated === 1 ? 'One needed' : `${counts.escalated} needed`} attention${counts.running ? '; one is being investigated now' : ''}.`;
    return `<div class="page-head"><div><h1>Supervision</h1><p class="sub">${sub}</p></div>
        ${pendingCase ? `<div class="demo-ctl"><span class="xs muted">Demo control</span><button class="btn" data-action="inject" data-case="${pendingCase.id}">${icon('play', 'sm')}Deliver ${esc(pendingCase.records.specNew.file)}</button></div>` : ''}</div>
      <div class="home-grid">
        <div>
          <section><div class="sec-h"><h2>Needs your decision</h2><span class="count">${open.length}</span></div>
            ${lead ? leadCase(S, lead) : `<div class="empty">${icon('check-circle')}<b>Nothing waits for you</b>Every case opened by the agent has a decision.</div>`}
            <div class="case-list">${[...open.slice(1), ...closed].map((c) => `<div class="case-row"><b class="rid">${c.id}</b><span class="cr-title">${esc(c.title)}</span>${statusTag(S.cs[c.id].status)}<button class="btn minimal" data-action="open-case" data-case="${c.id}" data-view="${isClosed(S.cs[c.id].status) ? 'plan' : 'investigation'}">Open</button></div>`).join('')}</div>
          </section>
          <details class="streams"><summary>What the agent watches (${S.ctx.streams.filter((s) => s.state === 'watched').length} streams, ${S.ctx.streams.filter((s) => s.state !== 'watched').length} proposed)</summary>
            <div class="table-wrap"><table class="t"><thead><tr><th>Stream</th><th>Watches</th><th>Rules</th><th>State</th></tr></thead><tbody>${streams}</tbody></table></div></details>
        </div>
        <section><div class="sec-h"><h2>Today's events</h2></div><ol class="events">${evs}</ol></section>
      </div>`;
  }

  /* ================= Evidence renderers ================= */
  function tokens(S, arr, ref) {
    const names = algNames(S);
    return (arr || []).map((t) => { const added = ref && !ref.includes(t); return `<span class="tok ${added ? 'add' : ''}">${added ? '+ ' : ''}${esc(names[t] || t)}</span>`; }).join('');
  }
  function removedTokens(S, before, after) { const names = algNames(S); return (before || []).filter((t) => !after.includes(t)).map((t) => `<span class="tok del">${esc(names[t] || t)}</span>`).join(''); }

  const fixedProducts = (S, c) => {
    const st = S.cs[c.id];
    if (!['approved', 'partial'].includes(st.status)) return new Set();
    return new Set(c.changes.filter((x) => x.entity === 'Product' && st.included[x.id]).map((x) => x.recordId));
  };

  function allergenMatrix(S, c, { fixed = new Set(), compact = false } = {}) {
    const al = S.ctx.allergens;
    const head = al.map((a) => `<th class="${a.code === c.alg ? 'hot' : ''}" title="${esc(a.name)}, Annex II item ${a.item}"><span>${esc(a.name)}</span></th>`).join('');
    const rows = c.matrix.map((r) => {
      const isFixed = fixed.has(r.id);
      const cells = al.map((a) => {
        const dec = r.declared.includes(a.code), miss = r.missing.includes(a.code);
        const cls = miss ? (isFixed ? 'm-fixed' : 'm-miss') : dec ? 'm-dec' : '';
        return `<td class="${cls} ${a.code === c.alg ? 'hotcol' : ''}">${miss ? (isFixed ? '●' : '!') : dec ? '●' : ''}</td>`;
      }).join('');
      return `<tr><th><span class="rid">${esc(r.id)}</span><span class="mx-name">${esc(r.name)}</span>${compact ? '' : `<span class="mx-via">${r.via === 'direct' ? 'uses the glaze directly' : `via ${esc(r.via)}`}</span>`}</th>${cells}</tr>`;
    }).join('');
    return `<div class="matrix-wrap"><table class="matrix"><thead><tr><th class="corner">Product<span>EU 1169/2011, Annex II</span></th>${head}</tr></thead><tbody>${rows}</tbody></table>
      <div class="mx-legend"><span><i class="lgd">●</i>Declared</span><span><i class="lgd m-miss">!</i>Required, not declared</span><span><i class="lgd m-fixed">●</i>Added by the approved plan</span></div></div>`;
  }

  function evidence(S, c, step) {
    const ev = step.evidence;
    if (ev.type === 'doc') return `<div class="doc"><div class="doc-h">${icon('file', 'sm')}<span class="raw">${esc(ev.title)}</span></div><dl>${ev.fields.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="raw">${esc(v)}</dd>`).join('')}</dl><div class="doc-note">${esc(ev.note)}</div></div>`;
    if (ev.type === 'records') return `<table class="t raw-t"><thead><tr><th>Record</th><th>Entity</th><th>Stored values</th></tr></thead><tbody>${ev.rows.map(([a, b, cc]) => `<tr><td class="raw">${esc(a)}</td><td>${esc(b)}</td><td class="raw">${esc(cc)}</td></tr>`).join('')}</tbody></table>`;
    if (ev.type === 'diff') {
      return `<table class="t diff-t"><thead><tr><th>Field</th><th>Stored version (v2)</th><th>Received version (v3)</th></tr></thead><tbody>${ev.rows.map((r) => {
        const arr = Array.isArray(r.after);
        const changed = arr ? !!(r.added && r.added.length) : r.before !== r.after;
        const lab = (x) => esc(x).replace(/\b(soy\w*|wheat|sesame)\b/gi, '<b>$1</b>');
        const after = arr ? r.after.map((x) => `<div class="${r.added.includes(x) ? 'add-line' : ''}">${r.added.includes(x) ? '+ ' : ''}${lab(x)}</div>`).join('') || '<span class="muted">none</span>' : esc(r.after);
        const before = arr ? r.before.map((x) => `<div>${lab(x)}</div>`).join('') || '<span class="muted">none</span>' : esc(r.before);
        return `<tr class="${changed ? 'chg' : ''} ${r.critical && changed ? 'crit' : ''}"><td>${esc(r.field)}</td><td class="raw">${before}</td><td class="raw">${after}</td></tr>`;
      }).join('')}</tbody></table>`;
    }
    if (ev.type === 'qty') {
      const k = 90 / Math.max(ev.ordered, ev.received);
      return `<div class="qty"><div class="qty-row"><span>Ordered on ${esc(c.records.po.id)}</span><div class="qbar"><i style="width:${ev.ordered * k}%"></i><b class="tol" style="left:${ev.ordered * (1 - ev.tolerance / 100) * k}%;width:${ev.ordered * (ev.tolerance / 50) * k}%"></b></div><b class="raw">${ev.ordered} kg</b></div>
        <div class="qty-row"><span>Received on ${esc(c.records.grn.id)}</span><div class="qbar"><i class="rcv" style="width:${ev.received * k}%"></i></div><b class="raw">${ev.received} kg</b></div>
        <div class="qty-delta">−${-ev.diffKg} kg <span>(−${-ev.pct} %)</span><em>The hatched band on the order bar is the ±${ev.tolerance} % tolerance.</em></div></div>`;
    }
    if (ev.type === 'hops') return `<ol class="hops">${ev.rows.map((h) => `<li><div class="hop-path"><span class="ent">${esc(h.from)}</span><span class="rel">${esc(h.rel)}</span><span class="ent">${esc(h.to)}</span><b>${h.ids.length}</b></div><div class="hop-ids">${h.ids.slice(0, 7).map((x) => `<span class="rid">${esc(x)}</span>`).join('')}${h.ids.length > 7 ? `<span class="more">+${h.ids.length - 7}</span>` : ''}</div><div class="xs muted">${esc(h.note)}</div></li>`).join('')}</ol>`;
    if (ev.type === 'matrix') return allergenMatrix(S, c, { fixed: fixedProducts(S, c) }) + `<ul class="extra">${ev.extra.map((x) => `<li class="raw">${esc(x)}</li>`).join('')}</ul>`;
    if (ev.type === 'lots') return `<table class="t raw-t"><thead><tr><th>Lot</th><th>Product</th><th class="num">Units</th><th>Glaze lot</th><th>Status</th><th>Verdict</th></tr></thead><tbody>${ev.rows.map((r) => `<tr><td class="raw">${esc(r.l.id)}</td><td class="raw">${esc(r.l.sku)}</td><td class="num">${r.l.units}</td><td class="raw">${esc(r.usedLot.supplierLot)}${r.newFormula ? ' <span class="tok add">new formula</span>' : ''}</td><td>${esc(r.l.status)}${r.l.dispatchAt ? `, dispatch ${hhmm(r.l.dispatchAt)}` : ''}</td><td>${r.verdict === 'Hold' ? tag('critical', 'Hold') : tag('', 'Not affected')}<div class="xs muted">${esc(r.reason)}</div></td></tr>`).join('')}</tbody></table>
      <div class="cust">${ev.customers.map((x) => `<span><b>${esc(x.c.name)}</b>${x.sheets.map((s) => `<span class="rid">${s}</span>`).join('')}</span>`).join('')}</div>`;
    if (ev.type === 'balance') return `<div class="balance"><div><span>Needed by tonight's runs</span><b>${ev.required} kg</b></div><div><span>Free stock plus received</span><b>${ev.free} + ${ev.received} = ${ev.available} kg</b></div><div class="bad"><span>Short</span><b>${ev.deficit} kg</b></div></div>
      <table class="t raw-t"><thead><tr><th>Run</th><th>Product</th><th class="num">Units</th><th class="num">kg per unit</th><th class="num">kg needed</th></tr></thead><tbody>${ev.runs.map((x) => `<tr><td class="raw">${x.r.id}</td><td>${esc(x.product.name)}</td><td class="num">${x.r.quantity}</td><td class="num">${x.kgu}</td><td class="num">${x.need}</td></tr>`).join('')}</tbody></table>`;
    if (ev.type === 'alloc') return `<table class="t raw-t"><thead><tr><th>Run</th><th>Order</th><th>Delivery</th><th class="num">Need</th><th class="num">Allocated</th><th class="num">Units possible</th><th>Result</th></tr></thead><tbody>${ev.rows.map((x) => `<tr><td class="raw">${x.r.id}</td><td>${x.order ? `<span class="raw">${x.order.id}</span> ${esc(x.customer.name)}` : 'Store restock'}</td><td>${x.order ? `${day(x.order.deliveryAt)} ${hhmm(x.order.deliveryAt)}` : '—'}</td><td class="num">${x.need} kg</td><td class="num">${x.got} kg</td><td class="num">${x.units} / ${x.r.quantity}</td><td>${x.status === 'Covered' ? tag('success', 'Covered') : x.status === 'At risk' ? tag('critical', 'At risk') : tag('warning', 'Defer')}</td></tr>`).join('')}</tbody></table>`;
    if (ev.type === 'plan') return `<ol class="plan-mini">${ev.actions.map((a) => `<li><span class="prio ${a.priority.toLowerCase()}">${a.priority}</span><div><b>${esc(a.title)}</b><div class="xs muted">${esc(a.owner)}, ${esc(a.due)}</div></div></li>`).join('')}</ol>`;
    return '';
  }

  /* ================= Investigation ================= */
  const KIND_CLASS = { Event: 'k-event', Retrieve: 'k-retrieve', Compare: 'k-compare', Traverse: 'k-traverse', Rule: 'k-rule', Impact: 'k-impact', Plan: 'k-plan' };

  function investigation(S) {
    const c = getCase(S, S.caseId), st = S.cs[c.id];
    const replay = S.inv.replay && S.inv.replay.caseId === c.id ? S.inv.replay.n : null;
    const shown = replay !== null ? replay : st.revealed;
    const running = st.status === 'investigating' || replay !== null;
    const sel = Math.max(0, Math.min(S.inv.sel[c.id] != null ? S.inv.sel[c.id] : c.steps.length - 1, shown - 1));
    const step = c.steps[sel];
    const rail = c.steps.map((s, i) => {
      const state = i < shown ? 'done' : i === shown && running ? 'run' : 'todo';
      return `<li class="${state} ${i === sel && i < shown ? 'sel' : ''}"><button data-action="pick-step" data-i="${i}" ${i < shown ? '' : 'disabled'}>
        <span class="n">${state === 'run' ? '<span class="spinner dark"></span>' : i + 1}</span><span class="body"><span class="kind ${KIND_CLASS[s.kind]}">${s.kind}</span><span class="tt">${esc(s.title)}</span>${i < shown ? `<span class="sm">${esc(s.summary)}</span>` : ''}</span></button></li>`;
    }).join('');
    const detail = shown === 0
      ? `<div class="card detail"><div class="empty">${icon('radar')}<b>Waiting for the first step</b>The agent starts as soon as the event is detected.</div></div>`
      : `<div class="card detail ${S.fresh.has('step') ? 'swap' : ''}">
        <div class="dt-head"><span class="kind ${KIND_CLASS[step.kind]}">Step ${sel + 1} of ${c.steps.length}</span><h2>${esc(step.title)}</h2>
          <div class="op"><span class="op-l">Operation</span><code>${esc(step.op)}</code></div>
          ${step.path.length ? `<div class="spath"><span class="op-l">Schema path</span>${step.path.map((p, i) => `${i ? icon('chev', 'sm') : ''}<span class="ent">${esc((S.ctx.schema.entities.find((e) => e.id === p) || {}).label || p)}</span>`).join('')}<button class="btn minimal" data-action="schema-from-step" data-i="${sel}">${icon('cube', 'sm')}Show on schema</button></div>` : ''}</div>
        <div class="band band-out"><div class="band-l">Conclusion<span>what the agent established</span></div><div class="band-b"><p class="outcome">${esc(step.outcome)}</p></div></div>
        <div class="band band-ev"><div class="band-l">${step.kind === 'Plan' ? 'Proposal<span>nothing applied yet</span>' : 'Evidence<span>source records</span>'}</div><div class="band-b">${evidence(S, c, step)}</div></div>
        ${step.rules.length ? `<div class="band band-rule"><div class="band-l">Rule<span>business meaning</span></div><div class="band-b">${step.rules.map((r) => `<div class="rule"><span class="ruleid">${r}</span><div>${esc(rule(S, r).text)}<div class="xs muted">Source: ${esc(rule(S, r).origin)}</div></div></div>`).join('')}</div></div>` : ''}
      </div>`;
    const done = shown >= c.steps.length && !running;
    return `<div class="case-head sev-${c.severity.toLowerCase()}">
        <div><div class="ch-meta"><span class="sev-label ${c.severity.toLowerCase()}">${icon('alert', 'sm')}${c.severity}, ${esc(c.category.toLowerCase())}</span>${statusTag(st.status)}<span class="lead-id">${c.id}</span></div>
          <h1>${esc(c.title)}</h1>
          <p class="sub">Detected at ${hhmm(c.detectedAt)} by the supervision agent watching ${esc(S.ctx.streams.find((s) => s.id === c.stream).name.toLowerCase())}. Trigger: ${esc(c.trigger)}. No operator request.</p></div>
        <div class="ch-actions"><button class="btn" data-action="replay" ${running ? 'disabled' : ''}>${icon('reset', 'sm')}Replay trace</button><button class="btn" data-action="open-case" data-case="${c.id}" data-view="ontology">${icon('cube', 'sm')}Open in ontology</button><button class="btn primary" data-action="open-case" data-case="${c.id}" data-view="plan" ${done ? '' : 'disabled'}>Review plan</button></div>
      </div>
      <div class="inv-grid"><div><div class="rail-h">Trace<span>${shown} of ${c.steps.length} steps</span></div><ol class="rail">${rail}</ol>
        <p class="rail-note">Each step shows the operation, the records read and the rule applied. Model reasoning is not displayed.</p></div>
        <div>${detail}</div><aside>${impactPanel(S, c, shown)}</aside></div>`;
  }

  function impactPanel(S, c, shown) {
    const after = (i) => shown > i;
    const row = (on, label, val, sub, cls = '') => `<div class="imp-row ${on ? 'on' : ''} ${cls}"><span>${label}</span><b>${on ? val : '—'}</b>${on && sub ? `<em>${esc(sub)}</em>` : ''}</div>`;
    let rows;
    if (c.scenario === 'allergen') {
      rows = row(after(2), 'New allergen', c.algName, 'Annex II item 11', 'bad')
        + row(after(3), 'Records reached through the schema', c.impact.recordsVisited, '')
        + row(after(4), 'Products missing the declaration', `${c.impact.products} of ${c.impact.productsLinked}`, '', 'bad')
        + row(after(4), 'Product sheets to correct', `${c.impact.sheets} of ${c.impact.sheetsLinked}`, '', 'bad')
        + row(after(5), 'Lots to hold', `${c.impact.lots} lots, ${c.impact.units} units`, c.deadline, 'bad')
        + row(after(5), 'Customers holding wrong sheets', c.impact.customers, '');
    } else {
      rows = row(after(2), 'Receipt against order', `−${c.records.po.qtyKg - c.records.grn.qtyKg} kg`, '−33.3 %', 'bad')
        + row(after(3), 'Runs using the ingredient', c.impact.runs, '')
        + row(after(4), 'Night-shift shortfall', `${c.deficit} kg`, `${c.required} kg needed, ${c.available} kg available`, 'bad')
        + row(after(5), 'Orders at risk', c.impact.atRisk, c.alloc.filter((x) => x.status === 'At risk').map((x) => x.order.id).join(', '), 'bad')
        + row(after(5), 'Runs to defer', c.impact.deferred, 'store restock');
    }
    const excluded = c.scenario === 'allergen' && after(5)
      ? `<div class="checked"><div class="xs muted">Checked and not affected</div>${c.records.lotRows.filter((x) => x.verdict !== 'Hold').map((x) => `<div><span class="rid">${x.l.id}</span> ${esc(x.reason)}</div>`).join('')}<div><span class="rid">${c.matrix.filter((m) => !m.missing.length).map((m) => m.id).join(', ')}</span> already declares sesame</div></div>` : '';
    const planBox = after(6) ? `<div class="imp-plan"><b>${c.actions.length} actions, ${c.changes.length} record changes</b><span>Proposed only. Nothing changes until you approve.</span><button class="btn primary block" data-action="open-case" data-case="${c.id}" data-view="plan">Review plan</button></div>` : '';
    return `<div class="card impact"><div class="card-h"><h2>Impact</h2><span class="meta">${shown >= c.steps.length ? 'complete' : 'building'}</span></div><div class="imp-rows">${rows}</div>${excluded}${planBox}</div>`;
  }

  /* ================= Action plan ================= */
  function plan(S) {
    const c = getCase(S, S.caseId), st = S.cs[c.id];
    if (st.status === 'pending' || st.status === 'investigating') return `<div class="card"><div class="empty" style="padding:64px">${icon('list')}<b>The plan is still being built</b>Open the investigation to follow it.<div style="margin-top:14px"><button class="btn" data-action="open-case" data-case="${c.id}" data-view="investigation">Open investigation</button></div></div></div>`;
    const decided = isClosed(st.status);
    const nIncl = c.changes.filter((x) => st.included[x.id]).length;
    const groups = [...new Set(c.changes.map((x) => x.entity))];
    const changeRows = groups.map((g) => {
      const list = c.changes.filter((x) => x.entity === g);
      return `<tr class="grp"><td colspan="6">${esc(g)} ${count(list.length)}</td></tr>` + list.map((x) => {
        const inc = !!st.included[x.id];
        const isAlg = x.kind !== 'status';
        const statusCell = decided ? (st.status === 'rejected' ? tag('critical', 'Rejected') : inc ? tag('success', 'Approved (demo)', 'check') : tag('', 'Excluded')) : inc ? tag('', 'Proposed') : tag('', 'Excluded');
        return `<tr class="${inc ? '' : 'excl'}"><td class="cbx">${decided ? '' : `<input type="checkbox" aria-label="Include ${esc(x.recordId)}" data-action="toggle-change" data-id="${x.id}" ${inc ? 'checked' : ''}>`}</td>
          <td><span class="rid">${esc(x.recordId)}</span><div class="xs muted">${esc(x.name || '')}</div></td><td>${esc(x.field)}${x.versionBefore ? `<div class="xs muted">v${x.versionBefore} → v${x.versionAfter}</div>` : ''}</td>
          <td>${isAlg ? tokens(S, x.before) : `<span class="tok">${esc(x.before[0])}</span>`}</td>
          <td>${isAlg ? tokens(S, x.after, x.before) + removedTokens(S, x.before, x.after) : `<span class="tok add">${esc(x.after[0])}</span>`}</td><td>${statusCell}</td></tr>`;
      }).join('');
    }).join('');
    const actions = c.actions.map((a) => `<li><span class="prio ${a.priority.toLowerCase()}">${a.priority}</span><div><b>${esc(a.title)}</b><p>${esc(a.why)}</p>
      <div class="act-meta"><span>${icon('user', 'sm')}${esc(a.owner)}</span><span>${icon('clock', 'sm')}${esc(a.due)}</span><span title="${esc(a.evidence.join(', '))}">${a.evidence.length} records</span><span class="ruleid" title="${esc(rule(S, a.rule).text)}">${a.rule}</span></div>
      </div></li>`).join('');
    const dec = st.decision;
    const decisionBar = decided
      ? `<div class="decided ${st.status}">${icon(st.status === 'rejected' ? 'x' : 'check-circle')}<div><b>${st.status === 'rejected' ? 'Plan rejected' : st.status === 'partial' ? `Plan approved with ${dec.accepted} of ${dec.proposed} changes` : `Plan approved: ${dec.accepted} changes`}</b> at ${hhmm(dec.at)} by ${esc(dec.operator)}.
          ${st.status === 'rejected' ? `Reason: ${esc(REASONS[dec.reasonCode])}. “${esc(dec.reasonText)}”` : 'Recorded in this demo only. No ERP, product-sheet or supplier system was changed.'}
          <div class="xs">Saved as a feedback signal. <button class="link" data-action="nav" data-view="audit">See it in the audit trail</button></div></div></div>`
      : `<div class="decision-bar"><div><b>${nIncl} of ${c.changes.length} changes selected</b><span>Approving records your decision in this demo. Nothing is written to ERP, product-sheet or supplier systems.</span></div>
          <button class="btn danger" data-action="reject-open">${icon('x', 'sm')}Reject plan</button><button class="btn success lg" data-action="approve-open" ${nIncl ? '' : 'disabled'}>${icon('check', 'sm')}Approve ${nIncl} change${nIncl === 1 ? '' : 's'}</button></div>`;
    return `<div class="case-head sev-${c.severity.toLowerCase()}"><div><div class="ch-meta"><span class="sev-label ${c.severity.toLowerCase()}">${icon('alert', 'sm')}${c.severity}, ${esc(c.category.toLowerCase())}</span>${statusTag(st.status)}<span class="lead-id">${c.id}</span></div>
        <h1>Resolution plan</h1><p class="sub">${esc(c.headline)}</p></div>
        <div class="ch-actions"><button class="btn" data-action="open-case" data-case="${c.id}" data-view="investigation">${icon('agent', 'sm')}Back to the trace</button></div></div>
      ${decisionBar}
      <div class="plan-grid">
        <section class="card"><div class="card-h"><h2>Actions</h2>${count(c.actions.length)}<span class="meta">each tied to a finding, a rule and records</span></div><ol class="actions">${actions}</ol></section>
        <div class="stack">
          ${c.scenario === 'allergen' ? `<section class="card"><div class="card-h"><h2>Allergen declarations</h2><span class="meta">${decided && st.status !== 'rejected' ? 'after the approved changes' : 'today, before any change'}</span></div><div class="card-b">${allergenMatrix(S, c, { fixed: decided ? fixedProducts(S, c) : new Set(), compact: true })}</div></section>` : ''}
          <section class="card"><div class="card-h"><h2>Change preview</h2>${count(c.changes.length)}<span class="meta">${decided ? '' : 'untick a change to leave it out'}</span></div>
            <div class="table-wrap"><table class="t changes"><thead><tr><th></th><th>Record</th><th>Field</th><th>Current</th><th>Proposed</th><th>Status</th></tr></thead><tbody>${changeRows}</tbody></table></div></section>
        </div>
      </div>`;
  }

  function modal(S) {
    if (!S.modal) return '';
    const c = getCase(S, S.modal.caseId), st = S.cs[c.id];
    const n = c.changes.filter((x) => st.included[x.id]).length;
    if (S.modal.type === 'approve') {
      return `<div class="overlay" data-action="modal-close"><div class="modal" role="dialog" aria-modal="true"><div class="modal-h">${icon('check-circle')}<h2>Approve ${n} change${n === 1 ? '' : 's'} for ${c.id}?</h2></div>
        <div class="modal-b"><ul><li>${n} of ${c.changes.length} proposed changes are marked approved in this demo.${c.changes.length - n === 1 ? ' The excluded change is recorded as excluded.' : c.changes.length - n ? ` The ${c.changes.length - n} excluded changes are recorded as excluded.` : ''}</li>
        <li>Nothing is written to the ERP, the product-sheet system or the supplier. Owners carry out each action in their own tools.</li>
        <li>Your decision is saved as a feedback signal for evaluating the agent.</li></ul>
        ${c.changes.length - n ? `<label class="fld">Why leave ${c.changes.length - n === 1 ? 'this change' : 'these changes'} out? <span class="xs muted" style="font-weight:400">Optional, saved with the feedback</span><textarea id="exclude-text" rows="2" placeholder="For example: PS-1053 is no longer sold to Le Marché Vert"></textarea></label>` : ''}</div>
        <div class="m-f"><button class="btn" data-action="modal-close">Cancel</button><button class="btn success" data-action="approve-confirm">Approve ${n} change${n === 1 ? '' : 's'}</button></div></div></div>`;
    }
    return `<div class="overlay" data-action="modal-close"><div class="modal" role="dialog" aria-modal="true"><div class="modal-h">${icon('x')}<h2>Reject the plan for ${c.id}?</h2></div>
      <form class="modal-b" data-action="reject-form"><p class="small">Your reason becomes a feedback signal: it tells the team what the agent got wrong.</p>
        <fieldset class="reasons"><legend class="xs muted">Reason</legend>${Object.entries(REASONS).filter(([k]) => k !== 'excluded-changes').map(([k, v], i) => `<label><input type="radio" name="reason" value="${k}" ${i === 0 ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</fieldset>
        <label class="fld">What should the agent have done?<textarea id="reject-text" rows="3" placeholder="${c.scenario === 'receipt' ? 'For example: Nordfjord already confirmed the balance by phone' : 'For example: PS-1053 is no longer sold to Le Marché Vert'}"></textarea></label>
        <div class="form-err" id="reject-err" hidden>Add a short explanation so the feedback is usable.</div>
        <div class="m-f" style="padding:12px 0 0"><button type="button" class="btn" data-action="modal-close">Cancel</button><button type="submit" class="btn danger-solid">Reject plan</button></div></form></div></div>`;
  }

  /* ================= Ontology ================= */
  const GRAPH_COLS = {
    allergen: { columns: ['Supplier', 'Supplier product', 'Ingredient, lots', 'Sub-recipe', 'Recipe', 'Product', 'Production lot', 'Product sheet'], relLabels: ['supplies', 'maps to', 'used in', 'used in', 'produces', 'made in', ''] },
    receipt: { columns: ['Supplier', 'Purchase order', 'Receipt, stock', 'Recipe', 'Production run', 'Customer order', 'Customer'], relLabels: ['receives', 'received as', 'used in', 'followed by', 'fulfils', 'placed by'] },
  };

  function ontology(S) {
    const tabs = `<div class="tabs"><button class="${S.ont.tab === 'graph' ? 'on' : ''}" data-action="ont-tab" data-tab="graph">${icon('layers', 'sm')}Case records</button><button class="${S.ont.tab === 'schema' ? 'on' : ''}" data-action="ont-tab" data-tab="schema">${icon('db', 'sm')}Business schema</button></div>`;
    if (S.ont.tab === 'schema') return ontSchema(S, tabs);
    const c = getCase(S, S.caseId), g = c.graph;
    const selNode = S.ont.node ? g.nodes.find((n) => n.id === S.ont.node) : null;
    let focus = null;
    const traceAll = selNode && (selNode.type === 'Allergen' || selNode.id === g.focus);
    if (traceAll) focus = new Set([selNode.id, ...g.nodes.filter((n) => n.state === 'affected' || n.state === 'changed').map((n) => n.id)]);
    else if (selNode) focus = App.graph.lineage(g, selNode.id);
    const svg = App.graph.caseGraph(c, { selected: S.ont.node, focusSet: focus, showAllergenLinks: !!(selNode && selNode.type === 'Allergen'), ...GRAPH_COLS[c.scenario] });
    const algNode = g.nodes.find((n) => n.type === 'Allergen');
    const traceBtn = algNode
      ? `<button class="btn ${selNode && selNode.type === 'Allergen' ? 'primary' : ''}" data-action="gnode" data-node="${algNode.id}">${icon('alert', 'sm')}Trace the ${esc(algNode.label.toLowerCase())} impact</button>`
      : `<button class="btn ${selNode && selNode.id === g.focus ? 'primary' : ''}" data-action="gnode" data-node="${g.focus}">${icon('alert', 'sm')}Trace from ${esc(g.focus)}</button>`;
    return `<div class="page-head"><div><h1>Ontology</h1><p class="sub">Records ${c.id} reached by following the schema, from the triggering event to the last affected record.</p></div>${tabs}</div>
      <div class="ont-grid"><section class="card graph-card">
        <div class="g-toolbar">${traceBtn}${S.ont.node ? '<button class="btn minimal" data-action="gnode-clear">Clear selection</button>' : ''}
          <span class="g-legend"><span><i class="lg-aff"></i>Needs review</span><span><i class="lg-chg"></i>Changed at source</span><span><i class="lg-ok"></i>Checked, fine</span><span><i class="lg-neu"></i>Context</span></span></div>
        ${selNode ? `<div class="selbar"><span class="tcolor" style="background:${App.TYPE_COLOR[selNode.type]}"></span><b>${esc(selNode.label)}</b><span>${esc(selNode.sub)}</span>${traceAll ? `<span class="sb-hot">${g.nodes.filter((n) => n.state === 'affected').length} records need review, highlighted below</span>` : `<span class="muted">Lineage highlighted: ${focus.size - 1} connected records</span>`}</div>` : ''}
        <div class="graph-scroll">${svg}</div></section>
        <aside class="card inspector">${inspector(S, c, selNode)}</aside></div>`;
  }

  function inspector(S, c, n) {
    if (!n) return `<div class="card-h"><h2>Inspector</h2></div><div class="card-b small muted">Select a record to see its attributes, source and relationships.${c.scenario === 'allergen' ? ' Start with <b>Sesame</b> to see everything that needs review.' : ''}</div>`;
    const recEntry = S.ctx.records[n.id];
    const ent = S.ctx.schema.entities.find((e) => e.id === n.type) || {};
    const src = recEntry && S.ctx.sources.find((s) => s.id === recEntry.source);
    const attrs = recEntry ? Object.entries(recEntry.record).filter(([k, v]) => !['id', 'sourceId', 'lines', 'x', 'y'].includes(k) && v != null && v !== '' && !(Array.isArray(v) && !v.length)).slice(0, 9) : [];
    const names = algNames(S);
    const fmt = (v) => (Array.isArray(v) ? v.map((x) => names[x] || x).join(', ') : String(v));
    const rels = c.graph.edges.filter((e) => e.from === n.id || e.to === n.id).map((e) => {
      const other = c.graph.nodes.find((x) => x.id === (e.from === n.id ? e.to : e.from));
      return `<li><span class="rel">${e.from === n.id ? '' : '← '}${esc(e.label)}${e.from === n.id ? ' →' : ''}</span><button class="link" data-action="gnode" data-node="${other.id}">${esc(other.label)}</button><span class="xs muted">${esc(other.sub)}</span></li>`;
    }).join('');
    const why = { affected: 'Needs review: part of the proposed correction.', changed: 'Part of the change that triggered the case.', ok: 'Checked by the agent: no change needed.', source: 'Context record retrieved by the agent.', neutral: 'Context record retrieved by the agent.' }[n.state];
    let extra = '';
    if (n.type === 'Allergen') {
      const aff = c.graph.nodes.filter((x) => x.state === 'affected');
      const byType = [...new Set(aff.map((x) => x.type))].map((t) => `<div><b>${esc((S.ctx.schema.entities.find((e) => e.id === t) || {}).label || t)}</b>${aff.filter((x) => x.type === t).map((x) => `<span class="rid">${esc(x.label)}</span>`).join('')}</div>`).join('');
      extra = `<div class="insp-sec"><h3>Records that need review ${count(aff.length)}</h3><div class="aff-list">${byType}</div></div>`;
    }
    return `<div class="card-h"><span class="tcolor" style="background:${App.TYPE_COLOR[n.type]}"></span><h2>${esc(n.label)}</h2><span class="meta">${esc(ent.label || n.type)}</span></div>
      <div class="card-b insp-grid"><div><p class="small">${esc(n.sub)}</p><p class="why ${n.state}">${esc(why)}</p>
        ${attrs.length ? `<dl class="attrs">${attrs.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="raw">${esc(fmt(v))}</dd>`).join('')}</dl>` : ''}
        <div class="xs muted">Identifier <span class="rid">${esc(n.id)}</span>${src ? `, from ${esc(src.name)} (${esc(src.file)})` : ''}${ent.table ? `, table ${esc(ent.table)}` : ''}</div></div>
        <div class="insp-sec"><h3>Relationships</h3><ul class="rels">${rels}</ul></div>${extra || '<div></div>'}</div>`;
  }

  function ontSchema(S, tabs) {
    const c = getCase(S, S.caseId);
    const t = S.ont.traversal;
    const activeRel = t >= 0 ? c.steps.slice(0, t + 1).flatMap((s) => s.relations) : [];
    const activeEnt = t >= 0 ? c.steps.slice(0, t + 1).flatMap((s) => s.path) : [];
    const pathEntities = [...new Set(c.steps.flatMap((s) => s.path))];
    const svg = App.graph.erDiagram(S.ctx.schema, { pathEntities: S.ont.showPath ? pathEntities : null, pathRelations: S.ont.showPath ? c.pathRelations : null, activeRelations: activeRel, activeEntities: activeEnt, selected: S.ont.ent });
    const ent = S.ont.ent ? S.ctx.schema.entities.find((e) => e.id === S.ont.ent) : null;
    const entRels = ent ? S.ctx.schema.relations.filter((r) => r.from === ent.id || r.to === ent.id) : [];
    const step = t >= 0 ? c.steps[t] : null;
    const label = (eid) => (S.ctx.schema.entities.find((e) => e.id === eid) || {}).label || eid;
    return `<div class="page-head"><div><h1>Ontology</h1><p class="sub">The business schema the agent is given. It can only reach records through these relationships.</p></div>${tabs}</div>
      <div class="schema-bar"><div class="seg-ctl">${visibleCases(S).map((x) => `<button class="${S.ont.showPath && S.caseId === x.id ? 'on' : ''}" data-action="schema-path" data-case="${x.id}">Path of ${x.id}</button>`).join('')}<button class="${S.ont.showPath ? '' : 'on'}" data-action="toggle-path">Whole schema</button></div>
        <button class="btn" data-action="traverse" ${S.ont.playing ? 'disabled' : ''}>${icon('play', 'sm')}Replay the agent's traversal</button>
        <div class="trav-cap">${step ? `<span class="kind ${KIND_CLASS[step.kind]}">Step ${t + 1}</span> ${esc(step.title)} <code>${esc(step.op)}</code>` : `<span class="muted">${S.ctx.schema.entities.length} entity types, ${S.ctx.schema.relations.length} relationships.${S.ont.showPath ? ` ${c.id} uses ${pathEntities.length} of them.` : ''}</span>`}</div></div>
      <div class="ont-grid"><section class="card er-card"><div class="graph-scroll">${svg}</div></section>
        <aside class="card inspector">${ent ? `<div class="card-h"><span class="tcolor" style="background:${App.TYPE_COLOR[ent.id]}"></span><h2>${esc(ent.label || ent.id)}</h2><span class="meta">table ${esc(ent.table)}</span></div>
          <div class="card-b insp-grid"><dl class="attrs">${ent.fields.map(([f, k]) => `<dt class="raw">${esc(f)}</dt><dd>${k || ''}</dd>`).join('')}</dl>
          <div class="insp-sec"><h3>Relationships</h3><ul class="rels">${entRels.map((r) => `<li><span class="rel">${esc(r.label)}, ${r.card}</span><button class="link" data-action="erent" data-ent="${r.from === ent.id ? r.to : r.from}">${esc(label(r.from === ent.id ? r.to : r.from))}</button></li>`).join('')}</ul></div>
          <div class="insp-sec"><h3>Used by</h3>${S.caseList.filter((x) => x.steps.some((s) => s.path.includes(ent.id))).map((x) => `<div class="small"><b class="rid">${x.id}</b> ${esc(x.short)}</div>`).join('') || '<div class="small muted">No case in this demo</div>'}</div></div>`
          : `<div class="card-h"><h2>Schema</h2></div><div class="card-b small"><p>Select an entity to see its keys and relationships.</p><p class="muted">Built from the data files and ${S.ctx.questions.length} operator questions (illustrative set; the target is 20 to 50). Prototype visualization: the schema is defined in the demo dataset, not generated live.</p></div>`}</aside></div>`;
  }

  /* ================= Audit and feedback ================= */
  function audit(S) {
    const all = [...S.audit, ...S.ctx.seededAudit];
    const stat = (k) => all.filter((a) => a.decision === k).length;
    const proposed = all.reduce((t, a) => t + a.proposed, 0), accepted = all.reduce((t, a) => t + a.accepted, 0);
    const reasons = all.filter((a) => a.reasonCode).map((a) => a.reasonCode);
    const rows = all.map((a) => {
      const key = a.caseId + a.at;
      const open = S.auditOpen === key;
      const signal = signalOf(a);
      return `<tr class="click ${open ? 'open' : ''} ${a.live && S.fresh.has('audit') ? 'arrive' : ''}" data-action="audit-row" data-key="${esc(key)}" tabindex="0"><td><span class="dec ${a.decision}">${a.decision === 'approved' ? 'Approved' : a.decision === 'partial' ? 'Partly approved' : 'Rejected'}</span></td>
        <td><b class="rid">${esc(a.caseId)}</b> ${esc(a.title)}</td><td class="num">${a.accepted} / ${a.proposed}</td><td>${a.reasonCode ? `${esc(REASONS[a.reasonCode] || a.reasonCode)}<div class="xs muted">“${esc(a.reasonText)}”</div>` : a.reasonText ? `<div class="xs muted">“${esc(a.reasonText)}”</div>` : '—'}</td><td>${day(a.at)}, ${hhmm(a.at)}</td><td>${a.live ? tag('info', 'This session') : tag('', 'Seeded history')}</td></tr>
        ${open ? `<tr class="detail-row"><td colspan="6"><div class="audit-detail">
          <dl><dt>Triggering event</dt><dd>${esc(a.trigger)}</dd><dt>Records used</dt><dd>${(a.records || []).slice(0, 16).map((x) => `<span class="rid">${esc(x)}</span>`).join('')}${(a.records || []).length > 16 ? ` +${a.records.length - 16}` : ''}</dd><dt>Discrepancy</dt><dd>${esc(a.discrepancy)}</dd><dt>Impacted</dt><dd>${esc(a.impacted)}</dd><dt>Proposed actions</dt><dd>${a.actions.map((x) => esc(x)).join('<br>')}</dd><dt>Decision</dt><dd>${esc(a.decision)}${a.operator ? `, ${esc(a.operator)}` : ''}</dd></dl>
          <div><div class="xs muted" style="margin-bottom:6px">Feedback signal, as stored</div><pre class="signal">${esc(JSON.stringify(signal, null, 2))}</pre></div></div></td></tr>` : ''}`;
    }).join('');
    return `<div class="page-head"><div><h1>Audit and feedback</h1><p class="sub">Every plan ends here with the operator's decision, so corrections become data instead of chat history.</p></div>
        <button class="btn" data-action="export-feedback">${icon('download', 'sm')}Export feedback (JSON)</button></div>
      <section class="card tiers"><div><h3>${tag('success', 'Works in this demo')}</h3><p>Each decision is stored as a structured record: trigger, records, discrepancy, impact, actions, decision, and the reason for any rejected or excluded change. Export it as JSON.</p></div>
        <div><h3>${tag('warning', 'Simulated')}</h3><p>The rates below are computed from this log. No evaluation pipeline consumes them yet.</p></div>
        <div><h3>${tag('', 'Not built')}</h3><p>Learning from feedback, an RLHF-like loop that updates prompts, rules or models from these signals, is planned and not implemented.</p></div></section>
      <div class="fb-stats"><div><b>${all.length}</b><span>decisions</span></div><div><b>${stat('approved')}</b><span>approved</span></div><div><b>${stat('partial')}</b><span>partly approved</span></div><div><b>${stat('rejected')}</b><span>rejected</span></div>
        <div><b>${proposed ? Math.round((accepted / proposed) * 100) : 0} %</b><span>of proposed changes accepted (${accepted} of ${proposed})</span></div>
        <div class="wide"><span>Reasons given</span>${[...new Set(reasons)].map((r) => `<em>${esc(REASONS[r])}: ${reasons.filter((x) => x === r).length}</em>`).join('') || '<em>none</em>'}</div></div>
      <section class="card"><div class="card-h"><h2>Decision log</h2>${count(all.length)}<span class="meta">select a row for the full record</span></div>
        <div class="table-wrap"><table class="t audit-t"><thead><tr><th>Decision</th><th>Case</th><th class="num">Changes accepted</th><th>Reason</th><th>When</th><th>Origin</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  const signalOf = (a) => ({ case_id: a.caseId, scenario: a.scenario, title: a.title, trigger: a.trigger, records_used: a.records || [], discrepancy: a.discrepancy, impacted: a.impacted, proposed_actions: a.actions, decision: a.decision, changes_proposed: a.proposed, changes_accepted: a.accepted, excluded_changes: a.excludedChanges || [], reason_code: a.reasonCode, reason_text: a.reasonText || null, operator: a.operator || null, agent_version: a.agentVersion || 'seeded', ruleset: a.ruleset || 'seeded', origin: a.live ? 'this session' : 'seeded demo history', recorded_at: a.at });

  /* ================= Evaluation ================= */
  const METRICS = [
    ['detected', 'Discrepancy detected', 'Did the system raise the case at all?'],
    ['precision', 'Record precision', 'Share of flagged records that truly need a change'],
    ['recall', 'Record recall', 'Share of records needing a change that were flagged'],
    ['actions', 'Correct actions', 'Proposed actions judged correct by the quality lead'],
    ['executed', 'Actions executed in software', 'Changes actually written to a system, not only suggested'],
    ['time', 'Time to plan', 'From event to a reviewable plan'],
    ['tokens', 'Tokens used', 'Input plus output tokens'],
  ];
  const RUNS = [['sched-meridian', 'Scheduled', 'Meridian'], ['sched-cowork', 'Scheduled', 'Claude Cowork'], ['target-meridian', 'Targeted', 'Meridian'], ['target-cowork', 'Targeted', 'Claude Cowork']];

  function evaluation(S) {
    const b = S.caseList.find((c) => c.scenario === 'allergen');
    const must = b.changes.map((x) => x.recordId);
    const mustNot = [...b.matrix.filter((m) => !m.missing.length).map((m) => m.id), ...b.records.sheets.filter((s) => s.allergens.includes(b.alg)).map((s) => s.id), ...b.records.lotRows.filter((x) => x.verdict !== 'Hold').map((x) => x.l.id)];
    const ev = S.evalData;
    const filled = Object.values(ev).filter((v) => v && String(v).trim()).length;
    return `<div class="page-head"><div><h1>Evaluation</h1><p class="sub">How we will compare the supervision agent with Claude Cowork on the same cases. Nothing here has been measured yet.</p></div>
        <button class="btn" data-action="export-eval">${icon('download', 'sm')}Export results (JSON)</button></div>
      <div class="eval-grid">
        <section class="card"><div class="card-h"><h2>Method</h2></div><div class="card-b method">
          <p><b>Scheduled task.</b> Each system receives the supplier-spec and receipt streams with no prompt and must raise the cases on its own.</p>
          <p><b>Targeted task.</b> An operator asks “Investigate SP-TER-05 v3” or “Check GRN-5512”. The system must find the same records.</p>
          <p><b>Scoring.</b> Flagged records are compared with the expected answer; the quality lead judges each proposed action. Times and token counts come from the run logs.</p></div></section>
        <section class="card"><div class="card-h"><h2>Expected answer for SPV-0193</h2><span class="meta">derived from the demo dataset</span></div><div class="card-b">
          <div class="small"><b>Must be flagged</b> ${count(must.length)}</div><div class="act-ev">${must.map((x) => `<span class="rid">${esc(x)}</span>`).join('')}</div>
          <div class="small" style="margin-top:14px"><b>Must not be flagged</b> ${count(mustNot.length)}</div><div class="act-ev">${mustNot.map((x) => `<span class="rid">${esc(x)}</span>`).join('')}</div></div></section>
      </div>
      <section class="card"><div class="card-h"><h2>Results</h2>${filled ? tag('info', `${filled} cells entered by hand`) : tag('', 'Pending, no run recorded')}<span class="meta">stored in this browser only</span></div>
        <div class="table-wrap"><table class="t eval-t"><thead><tr><th>Metric</th>${RUNS.map(([, t, s]) => `<th>${t}<div class="xs muted">${s}</div></th>`).join('')}</tr></thead><tbody>
        ${METRICS.map(([k, lbl, hint]) => `<tr><td><b>${lbl}</b><div class="xs muted">${hint}</div></td>${RUNS.map(([rk]) => `<td><input class="eval-in" data-key="${rk}.${k}" value="${esc(ev[`${rk}.${k}`] || '')}" placeholder="pending" aria-label="${esc(lbl)}, ${rk}"></td>`).join('')}</tr>`).join('')}
        </tbody></table></div></section>`;
  }

  /* ================= Ops Analyst ================= */
  const SUGGESTIONS = ['Open SPV-0193', 'Which product sheets need correcting, by customer?', 'Which lots must be held before dispatch?', 'Show the salmon shortfall by production run'];

  function answer(S, r) {
    const who = `<div class="who"><i class="dia"></i><b>Ops Analyst</b><span>deterministic demo response</span></div>`;
    if (r.kind === 'unsupported') return `${who}<div class="ai-body"><p>${esc(r.text)}</p></div>`;
    const c = getCase(S, r.caseId);
    if (S.cs[c.id].status === 'pending') return `${who}<div class="ai-body"><p>${c.id} has not been detected yet in this demo session. Deliver the supplier spec from the Supervision page first.</p></div>`;
    if (r.kind === 'open') {
      const st = S.cs[c.id];
      return `${who}<div class="ai-body"><p class="ans-lead">${c.id} is ${STATUS[st.status][1].toLowerCase()}: ${esc(c.title)}.</p><p>${esc(c.headline)}</p>
        <div class="obj-card sev-${c.severity.toLowerCase()}"><div><span class="sev-label ${c.severity.toLowerCase()}">${c.severity}</span> <b class="rid">${c.id}</b> ${esc(c.short)}<div class="xs muted">${esc(c.chips.join(', '))}</div></div><button class="btn primary" data-action="open-case" data-case="${c.id}" data-view="investigation">Open investigation</button></div></div>`;
    }
    if (r.kind === 'sheets') {
      const rows = c.sheetsByCustomer.map((x) => ({ label: x.name, value: x.n }));
      const sheets = c.changes.filter((x) => x.entity === 'Product sheet');
      return `${who}<div class="ai-body"><p class="ans-lead">${sheets.length} product sheets need sesame added, across ${rows.length} customers.</p>
        <div class="chart-box chart">${App.charts.hbars(rows, { unit: '' })}</div><div class="caption">Sheets to correct per customer, ${c.id}</div>
        <table class="t grid-t"><thead><tr><th>Sheet</th><th>Product and customer</th><th>Version</th></tr></thead><tbody>${sheets.map((x) => `<tr><td class="raw">${x.recordId}</td><td>${esc(x.name)}</td><td>v${x.versionBefore} → v${x.versionAfter}</td></tr>`).join('')}</tbody></table></div>`;
    }
    if (r.kind === 'lots') {
      const newLot = c.records.ingLots.find((l) => l.supplierLot >= c.records.specNew.effectiveFromLot);
      return `${who}<div class="ai-body"><p class="ans-lead">${c.impact.lots} lots, ${c.impact.units} units, must be held before the 11:00 dispatch.</p><p>They were made with glaze lot ${esc(newLot.supplierLot)} and their labels do not declare sesame. ${c.records.lotRows.length - c.impact.lots} other lots were checked and are not affected.</p>
        <table class="t grid-t"><thead><tr><th>Lot</th><th>Product</th><th class="num">Units</th><th>Verdict</th></tr></thead><tbody>${c.records.lotRows.map((x) => `<tr><td class="raw">${x.l.id}</td><td class="raw">${esc(x.l.sku)}</td><td class="num">${x.l.units}</td><td>${x.verdict === 'Hold' ? tag('critical', 'Hold') : tag('', 'Not affected')} <span class="xs muted">${esc(x.reason)}</span></td></tr>`).join('')}</tbody></table></div>`;
    }
    if (r.kind === 'salmon') {
      return `${who}<div class="ai-body"><p class="ans-lead">Tonight's runs need ${c.required} kg of salmon; ${c.available} kg is available after GRN-5512, so ${c.deficit} kg is short.</p><p>By delivery time, ${c.alloc.filter((x) => x.status === 'Covered').map((x) => x.r.id).join(' and ')} are covered. ${c.alloc.filter((x) => x.status === 'At risk').map((x) => `${x.r.id} for ${x.customer.name}`).join(', ')} is at risk and the restock run is deferred.</p>
        <div class="chart-box chart">${App.charts.allocation(c.alloc.map((x) => ({ label: x.r.id, sub: x.order ? `${x.order.id}, ${hhmm(x.order.deliveryAt)}` : 'store restock', need: x.need, got: x.got })))}</div><div class="caption">Salmon allocated against need, ${c.id}</div></div>`;
    }
    return '';
  }

  function analytics(S) {
    const msgs = S.chat.messages.map((m) => (m.role === 'user' ? `<div class="msg-user">${esc(m.text)}</div>` : `<div class="msg-ai ${m.fresh ? 'swap' : ''}">${answer(S, m.r)}</div>`)).join('');
    return `<div class="page-head"><div><h1>Ops Analyst</h1><p class="sub">Explore the records the supervision agent used. It answers questions; it does not watch.</p></div>
        ${S.chat.messages.length ? `<button class="btn" data-action="chat-clear">${icon('reset', 'sm')}New conversation</button>` : ''}</div>
      <div class="chat">${msgs || `<div class="msg-ai"><div class="who"><i class="dia"></i><b>Ops Analyst</b></div><div class="ai-body"><p>Ask about a case by its identifier, or about the sheets, lots and runs it touches. In this prototype, questions map to a fixed set of analyses; no language model is called.</p></div></div>`}
        ${S.chat.pending ? '<div class="waiting"><span class="spinner dark"></span>Querying the ontology…</div>' : ''}
        <div class="an-composer"><div class="suggest">${SUGGESTIONS.map((q, i) => `<button data-action="suggest" data-i="${i}">${esc(q)}</button>`).join('')}</div>
          <form class="composer-box" data-action="ask-form"><input id="ask" value="${esc(S.chat.draft)}" placeholder="Ask a question, or type a case identifier…" autocomplete="off" ${S.chat.pending ? 'disabled' : ''}>
          <div class="row"><span class="pillm"><i></i>Deterministic demo</span><button class="send" type="submit" aria-label="Ask" ${S.chat.pending ? 'disabled' : ''}>${icon('send', 'sm')}</button></div></form></div></div>`;
  }

  App.views = { nav, appbar, statusbar, home, investigation, plan, ontology, audit, evaluation, analytics, modal, SUGGESTIONS, REASONS, signalOf };
})(window.App = window.App || {});
