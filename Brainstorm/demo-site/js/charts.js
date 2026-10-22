/*
 * Hand-built SVG charts for the Ops Analyst (steel-blue bars, light gridlines, axis ticks).
 */
(function (App) {
  const C = { bar: '#3d3e43', dark: '#16171a', risk: '#c42b1c', warn: '#b45309', grid: 'rgba(28,27,24,0.10)', t1: '#16171a', t3: '#646569', t4: '#646569' };
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 15}" font-weight="${o.w || 400}" fill="${o.fill || C.t3}" text-anchor="${o.anchor || 'middle'}">${s}</text>`;

  /** Horizontal bars. rows: [{ label, value, color? }] */
  function hbars(rows, { unit = '', max, step = 1, width = 980 } = {}) {
    const lx = 150, bw = width - lx - 50, rowH = 40, top = 6;
    const m = max || Math.max(...rows.map((r) => r.value));
    const k = bw / m, bottom = top + rows.length * rowH;
    let out = '';
    for (let v = 0; v <= m; v += step) { const x = lx + v * k; out += `<line x1="${x}" x2="${x}" y1="${top}" y2="${bottom}" stroke="${C.grid}"/>` + txt(x, bottom + 16, v, { size: 12 }); }
    rows.forEach((r, i) => {
      const y = top + i * rowH + 8;
      out += txt(lx - 10, y + 17, r.label, { anchor: 'end', fill: C.t1 });
      out += `<rect class="bar-grow-x" style="animation-delay:${i * 0.07}s" x="${lx}" y="${y}" width="${r.value * k}" height="26" fill="${r.color || C.bar}"/>`;
      out += txt(lx + r.value * k + 8, y + 18, `${r.value}${unit}`, { anchor: 'start', w: 700, fill: C.t1 });
    });
    return `<svg viewBox="0 0 ${width} ${bottom + 24}" role="img">${out}</svg>`;
  }

  /** Need vs allocated kg per production run. rows: [{ label, need, got }] */
  function allocation(rows, { width = 980 } = {}) {
    const lx = 170, bw = width - lx - 90, rowH = 46, top = 6;
    const m = Math.ceil(Math.max(...rows.map((r) => r.need)) / 10) * 10, k = bw / m, bottom = top + rows.length * rowH;
    let out = '';
    for (let v = 0; v <= m; v += 10) { const x = lx + v * k; out += `<line x1="${x}" x2="${x}" y1="${top}" y2="${bottom}" stroke="${C.grid}"/>` + txt(x, bottom + 16, v, { size: 12 }); }
    rows.forEach((r, i) => {
      const y = top + i * rowH + 8;
      out += txt(lx - 10, y + 13, r.label, { anchor: 'end', fill: C.t1 }) + txt(lx - 10, y + 29, r.sub || '', { anchor: 'end', size: 12 });
      out += `<rect x="${lx}" y="${y}" width="${r.need * k}" height="30" fill="rgba(196,43,28,0.08)" stroke="${r.need > r.got ? C.risk : 'none'}" stroke-dasharray="3 2"/>`;
      out += `<rect class="bar-grow-x" style="animation-delay:${i * 0.07}s" x="${lx}" y="${y}" width="${r.got * k}" height="30" fill="${r.got >= r.need ? C.dark : C.warn}"/>`;
      out += txt(lx + r.need * k + 8, y + 20, `${r.got} / ${r.need} kg`, { anchor: 'start', w: 700, fill: r.got >= r.need ? C.t1 : '#AC2F33' });
    });
    out += txt(lx + bw / 2, bottom + 34, 'kg of salmon fillet', { size: 13, w: 600, fill: C.t1 });
    return `<svg viewBox="0 0 ${width} ${bottom + 40}" role="img">${out}</svg>`;
  }

  App.charts = { hbars, allocation };
})(window.App = window.App || {});
