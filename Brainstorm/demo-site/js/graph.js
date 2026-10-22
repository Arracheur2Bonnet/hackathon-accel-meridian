/*
 * Graph renderers (inline SVG, no dependencies):
 *  - caseGraph: the records one case touched, laid out left→right along the schema
 *  - erDiagram: the business schema the agent is allowed to traverse
 */
(function (App) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const TYPE_COLOR = {
    Supplier: '#404854', SupplierProduct: '#404854', SpecVersion: '#7961DB', Allergen: '#CD4246', Ingredient: '#2D72D2', IngredientLot: '#5B9BC8',
    SubRecipe: '#2D72D2', Recipe: '#215DB0', Product: '#147EB3', ProductSheet: '#0F6894', ProductionLot: '#C87619', PurchaseOrder: '#404854',
    GoodsReceipt: '#7961DB', Inventory: '#5B9BC8', ProductionRun: '#215DB0', CustomerOrder: '#0F6894', Customer: '#404854',
  };
  App.TYPE_COLOR = TYPE_COLOR;

  /* ---------- layout ---------- */
  function layout(g) {
    const W = 172, H = 40, PITCH = 47, GAP = 12, COLW = 198, TOP = 64;
    const nodes = g.nodes.map((n) => ({ ...n }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const nbrs = (n) => g.edges.flatMap((e) => (e.from === n.id ? [byId[e.to]] : e.to === n.id ? [byId[e.from]] : [])).filter(Boolean);
    const maxCol = Math.max(...nodes.map((n) => n.col));
    // rightmost column: sequential, gap between groups
    let y = 0, lastGroup;
    nodes.filter((n) => n.col === maxCol).forEach((n) => { if (lastGroup !== undefined && n.group !== lastGroup) y += GAP; n.y = y; y += PITCH; lastGroup = n.group; });
    for (let c = maxCol - 1; c >= 0; c--) {
      const col = nodes.filter((n) => n.col === c && n.type !== 'Allergen');
      col.forEach((n) => { const r = nbrs(n).filter((m) => m.col > c && m.y !== undefined && m.type !== 'Allergen'); if (r.length) n.y = r.reduce((t, m) => t + m.y, 0) / r.length; });
    }
    // allergen sits above everything; a node linked to it aligns with it
    const top = Math.min(...nodes.filter((n) => n.y !== undefined).map((n) => n.y)) - PITCH * 1.4;
    nodes.filter((n) => n.type === 'Allergen').forEach((n) => { n.y = top; });
    nodes.filter((n) => n.y === undefined).forEach((n) => { if (nbrs(n).some((m) => m.type === 'Allergen')) n.y = top; });
    // unplaced: align with a placed neighbour in a lower column, else stack under one in the same column
    nodes.filter((n) => n.y === undefined).forEach((n) => {
      const left = nbrs(n).filter((m) => m.col < n.col && m.y !== undefined && m.type !== 'Allergen');
      if (left.length && !nbrs(n).some((m) => m.col === n.col)) n.y = left[0].y;
    });
    for (let pass = 0; pass < 3; pass++) {
      nodes.filter((n) => n.y === undefined).forEach((n) => {
        const anchor = nbrs(n).find((m) => m.col === n.col && m.y !== undefined);
        if (anchor) n.y = anchor.y + PITCH;
      });
    }
    nodes.filter((n) => n.y === undefined).forEach((n) => { n.y = Math.max(...nodes.filter((m) => m.col === n.col && m.y !== undefined).map((m) => m.y), 0) + PITCH; });
    // resolve overlaps per column
    for (let c = 0; c <= maxCol; c++) {
      const col = nodes.filter((n) => n.col === c).sort((a, b) => a.y - b.y);
      for (let i = 1; i < col.length; i++) if (col[i].y < col[i - 1].y + PITCH) col[i].y = col[i - 1].y + PITCH;
    }
    const minY = Math.min(...nodes.map((n) => n.y));
    nodes.forEach((n) => { n.y = n.y - minY + TOP; n.x = 10 + n.col * COLW; });
    const height = Math.max(...nodes.map((n) => n.y)) + H + 16;
    return { nodes, byId: Object.fromEntries(nodes.map((n) => [n.id, n])), W, H, width: 10 + maxCol * COLW + W + 10, height, COLW };
  }

  /** Upstream + downstream closure from a node (lineage). */
  function lineage(g, id) {
    const out = new Set([id]);
    const walk = (dir) => { let frontier = [id]; while (frontier.length) { const next = []; frontier.forEach((x) => g.edges.forEach((e) => { const [a, b] = dir ? [e.from, e.to] : [e.to, e.from]; if (a === x && !out.has(b)) { out.add(b); next.push(b); } })); frontier = next; } };
    walk(true); walk(false);
    return out;
  }

  /**
   * opts: { selected, focusSet (Set of ids to keep bright), showAllergenLinks, columns: [labels], relLabels: [labels between columns], reveal }
   */
  function caseGraph(c, opts = {}) {
    const L = layout(c.graph);
    const { W, H } = L;
    const focus = opts.focusSet || null;
    const dim = (id) => (focus && !focus.has(id) ? ' dim' : '');
    let edges = '', nodes = '', heads = '';
    // column headers with relation labels between them
    (opts.columns || []).forEach((label, i) => {
      const x = 10 + i * L.COLW;
      heads += `<text class="g-colh" x="${x}" y="22">${esc(label)}</text>`;
      if (opts.relLabels && opts.relLabels[i]) heads += `<text class="g-rel" x="${x + W + (L.COLW - W) / 2}" y="40" text-anchor="middle">${esc(opts.relLabels[i])}</text><path class="g-relarrow" d="M${x + W + 6},46 L${x + L.COLW - 6},46" marker-end="url(#gArr)"/>`;
    });
    c.graph.edges.forEach((e) => {
      const a = L.byId[e.from], b = L.byId[e.to];
      if (!a || !b) return;
      const isAlg = a.type === 'Allergen' || b.type === 'Allergen';
      if (isAlg && !opts.showAllergenLinks && e.label !== 'declares (new)') return;
      if (e.hidden && !(focus && focus.has(e.from) && focus.has(e.to))) return;
      let d;
      if (a.col === b.col) {
        const x = a.x - 2, bulge = 22 + Math.min(40, Math.abs(b.y - a.y) / 6);
        if (isAlg) { const xr = a.x + W + 1, bx = 13; d = `M${xr},${a.y + H / 2} C${xr + bx},${a.y + H / 2} ${xr + bx},${b.y + H / 2} ${xr},${b.y + H / 2}`; }
        else d = `M${x},${a.y + H / 2} C${x - bulge},${a.y + H / 2} ${x - bulge},${b.y + H / 2} ${x},${b.y + H / 2}`;
      } else {
        const [s, t] = a.col < b.col ? [a, b] : [b, a];
        const x1 = s.x + W, y1 = s.y + H / 2, x2 = t.x, y2 = t.y + H / 2, mx = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      }
      const on = !focus || (focus.has(e.from) && focus.has(e.to));
      edges += `<path class="g-e ${e.state} ${on ? '' : 'dim'}" d="${d}"/>`;
    });
    L.nodes.forEach((n) => {
      const sel = opts.selected === n.id ? ' sel' : '';
      const hidden = opts.reveal && !opts.reveal.has(n.id) ? ' hide' : '';
      const badge = n.state === 'affected' ? `<circle class="g-badge" cx="${n.x + W - 12}" cy="${n.y + 12}" r="6"/><text class="g-badge-t" x="${n.x + W - 12}" y="${n.y + 15.5}" text-anchor="middle">!</text>`
        : n.state === 'ok' ? `<path class="g-ok" d="M${n.x + W - 17},${n.y + 12} l3.5,3.5 l6,-7"/>` : '';
      nodes += `<g class="g-n ${n.state}${sel}${dim(n.id)}${hidden}" data-action="gnode" data-node="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(n.label + ' ' + n.sub)}">
        <rect class="g-body" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="3"/>
        <rect x="${n.x}" y="${n.y}" width="4" height="${H}" fill="${TYPE_COLOR[n.type] || '#8F99A8'}"/>
        <text class="g-id" x="${n.x + 12}" y="${n.y + 16}">${esc(trunc(n.label, 18))}</text>
        <text class="g-sub" x="${n.x + 12}" y="${n.y + 32}">${esc(trunc(n.sub, 23))}</text>${badge}</g>`;
    });
    const defs = `<defs><marker id="gArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,1 L9,5 L0,9" fill="none" stroke="#8F99A8" stroke-width="1.6"/></marker></defs>`;
    return `<svg class="cgraph" viewBox="0 0 ${L.width} ${L.height}" role="img" aria-label="Records linked to ${esc(c.id)}">${defs}${heads}<g>${edges}</g><g>${nodes}</g></svg>`;
  }

  /* ---------- ER diagram ---------- */
  function erDiagram(schema, opts = {}) {
    const BW = 200, HH = 30, FH = 21;
    const ent = Object.fromEntries(schema.entities.map((e) => [e.id, { ...e, h: HH + e.fields.length * FH + 8 }]));
    const onPath = new Set(opts.pathEntities || []);
    const rels = new Set(opts.pathRelations || []);
    const active = new Set(opts.activeRelations || []);
    const activeEnt = new Set(opts.activeEntities || []);
    let lines = '', boxes = '';
    schema.relations.forEach((r) => {
      const a = ent[r.from], b = ent[r.to];
      let d, lx, ly;
      if (r.via && r.via < 400) { // route above, between rows
        const x1 = a.x + BW / 2, x2 = b.x + BW / 2;
        d = `M${x1},${a.y} L${x1},${r.via} L${x2},${r.via} L${x2},${b.y}`; lx = (x1 + x2) / 2; ly = r.via;
      } else if (r.via) { // route on the right edge
        d = `M${a.x + BW},${a.y + a.h / 2} L${r.via},${a.y + a.h / 2} L${r.via},${b.y + b.h / 2} L${b.x + BW},${b.y + b.h / 2}`; lx = r.via + 64; ly = (a.y + b.y + b.h) / 2;
      } else if (Math.abs(a.y - b.y) < 5) {
        const [s, t] = a.x < b.x ? [a, b] : [b, a];
        d = `M${s.x + BW},${s.y + 40} L${t.x},${t.y + 40}`; lx = (s.x + BW + t.x) / 2; ly = s.y + 40;
      } else if (Math.abs(a.x - b.x) < 5) {
        const [s, t] = a.y < b.y ? [a, b] : [b, a];
        d = `M${s.x + BW / 2},${s.y + s.h} L${t.x + BW / 2},${t.y}`; lx = s.x + BW / 2; ly = (s.y + s.h + t.y) / 2;
      } else {
        const [s, t] = a.y < b.y ? [a, b] : [b, a];
        const x1 = s.x + BW / 2, y1 = s.y + s.h, x2 = t.x + BW / 2, y2 = t.y;
        d = `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`; const lt = r.labelAt || 0.5; lx = x1 + (x2 - x1) * lt; ly = y1 + (y2 - y1) * lt;
      }
      const cls = active.has(r.id) ? 'active' : rels.has(r.id) ? 'path' : opts.pathRelations ? 'off' : '';
      const short = Math.abs(a.y - b.y) < 5 && !r.via;
      const lbl = short ? r.card : `${r.label} · ${r.card}`;
      lines += `<g class="er-r ${cls}"><title>${esc(r.label + ' · ' + r.card)}</title><path d="${d}"/><rect x="${lx - lbl.length * 3.6 - 6}" y="${ly - 10}" width="${lbl.length * 7.2 + 12}" height="20" rx="3"/><text x="${lx}" y="${ly + 4.5}" text-anchor="middle">${esc(lbl)}</text></g>`;
    });
    schema.entities.forEach((e0) => {
      const e = ent[e0.id];
      const cls = activeEnt.has(e.id) ? 'active' : onPath.has(e.id) ? 'path' : opts.pathEntities ? 'off' : '';
      const sel = opts.selected === e.id ? ' sel' : '';
      boxes += `<g class="er-e ${cls}${sel}" data-action="erent" data-ent="${e.id}" tabindex="0" role="button" aria-label="${esc(e.label || e.id)}">
        <rect class="er-box" x="${e.x}" y="${e.y}" width="${BW}" height="${e.h}" rx="3"/>
        <rect class="er-head" x="${e.x}" y="${e.y}" width="${BW}" height="${HH}" rx="3"/><rect x="${e.x}" y="${e.y}" width="4" height="${e.h}" fill="${TYPE_COLOR[e.id] || '#8F99A8'}"/>
        <text class="er-name" x="${e.x + 12}" y="${e.y + 20}">${esc(e.label || e.id)}</text>${(e.label || e.id).length * 8.2 + e.table.length * 7.4 < 168 ? `<text class="er-table" x="${e.x + BW - 10}" y="${e.y + 20}" text-anchor="end">${esc(e.table)}</text>` : ''}
        ${e.fields.map(([f, k], i) => `<text class="er-f" x="${e.x + 12}" y="${e.y + HH + 16 + i * FH}">${esc(f)}</text>${k ? `<text class="er-k ${k.toLowerCase()}" x="${e.x + BW - 10}" y="${e.y + HH + 16 + i * FH}" text-anchor="end">${k}</text>` : ''}`).join('')}
      </g>`;
    });
    return `<svg class="er" viewBox="0 0 1560 540" role="img" aria-label="Business schema">${lines}${boxes}</svg>`;
  }

  App.graph = { caseGraph, erDiagram, lineage, layout };
})(window.App = window.App || {});
