/* SVG rendering of the plan and items (shared by the screen view and exports). */
window.PAC = window.PAC || {};

(function () {
  const F = PAC.FONT, esc = PAC.esc;

  function hslHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  }
  PAC.linkColor = function (link) {
    let h = 0; for (const ch of String(link)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return hslHex(h, 60, 48);
  };

  /* Stroke attribute helper. Screen: constant pixel width. Export: width in world mm for the given scale. */
  PAC.strokeFn = function (mode, den) {
    if (mode === 'export') return px => `stroke-width="${(px * den * 0.18).toFixed(1)}"`;
    return px => `stroke-width="${px}" vector-effect="non-scaling-stroke"`;
  };

  function rect(r, attrs) { return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" ${attrs}/>`; }
  function text(x, y, s, size, attrs) { return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" ${F} ${attrs || ''}>${esc(s)}</text>`; }
  /* Text centred on (x, y) that stays upright on screen whatever the view rotation. */
  function utext(x, y, s, size, attrs, rot) {
    return `<g transform="translate(${Math.round(x)} ${Math.round(y)}) rotate(${-(rot || 0)})">${text(0, Math.round(size * 0.35), s, size, attrs)}</g>`;
  }
  /* World direction that appears as screen-up for a view rotation. */
  function upVec(rot) { const a = rot * Math.PI / 180; return [-Math.round(Math.sin(a)), -Math.round(Math.cos(a))]; }
  PAC.upVec = upVec;

  /* Door leaves + swing arcs, drawn in a local frame where the opening runs along x and "out" is -y. */
  PAC.doorSymbol = function (d, cx, cy, sw, side, thick) {
    side = side || d.side;
    const ang = { n: 0, e: 90, s: 180, w: 270 }[side] || 0, w = d.w, h = w / 2;
    if (d.type === 'sliding') {
      // cavity slider: dashed pocket inside the wall, leaf drawn mostly slid into it
      const tt = Math.max(200, thick || 200) / 2, pk = tt - 30, lw = 45;
      const one = (x0, len) => // pocket from x0-len..x0 (to the left of jamb x0), leaf 80% inside
        `<rect x="${x0 - len}" y="${-pk}" width="${len}" height="${2 * pk}" fill="#e2e8f0" stroke="#94a3b8" stroke-dasharray="80 60" ${sw(0.8)}/>` +
        `<rect x="${x0 - len * 0.8}" y="${-lw / 2}" width="${len}" height="${lw}" fill="#475569" stroke="#1e293b" ${sw(0.8)}/>`;
      let s;
      if ((d.leaves || 1) === 2) s = one(-h, h) + `<g transform="scale(-1 1)">${one(-h, h)}</g>`;
      else s = d.hinge === 'right' ? `<g transform="scale(-1 1)">${one(-h, w)}</g>` : one(-h, w);
      return `<g transform="translate(${cx} ${cy}) rotate(${ang})">${s}</g>`;
    }
    let p;
    if ((d.leaves || 2) === 1) {
      p = d.hinge === 'right' ? `M${h} 0 L${h} ${-w} A${w} ${w} 0 0 0 ${-h} 0` : `M${-h} 0 L${-h} ${-w} A${w} ${w} 0 0 1 ${h} 0`;
    } else {
      p = `M${-h} 0 L${-h} ${-h} A${h} ${h} 0 0 1 0 0 M${h} 0 L${h} ${-h} A${h} ${h} 0 0 0 0 0`;
    }
    const flip = d.swing === 'in' ? ' scale(1 -1)' : '';
    return `<g transform="translate(${cx} ${cy}) rotate(${ang})${flip}"><path d="${p}" fill="none" stroke="#2b2f36" ${sw(1)}/></g>`;
  };

  /* Base drawing: grid, outdoor, context rooms, usable rooms, walls, doors, retractable seating. */
  PAC.renderBase = function (settings, o) {
    const sw = o.sw, G = PAC.GRID, out = [], vr = o.viewRot || 0, sideways = vr % 180 !== 0;
    // outdoor
    for (const a of PAC.OUTDOOR) {
      out.push(rect(a, `fill="none" stroke="#9aa3ad" stroke-dasharray="300 200" ${sw(1)}`));
      out.push(utext(a.x + a.w / 2, a.y + a.h / 2, a.name.toUpperCase(), 380, 'fill="#9aa3ad" letter-spacing="40"', vr));
    }
    // grid
    const gxs = Object.values(G.x), gys = Object.values(G.y);
    const gx0 = Math.min(...gxs) - 1500, gy0 = Math.min(...gys) - 2600, gx1 = Math.max(...gxs) + 700, gy1 = Math.max(...gys) + 2800;
    for (const k in G.x) {
      const x = G.x[k];
      out.push(`<line x1="${x}" y1="${gy0 + 450}" x2="${x}" y2="${gy1}" stroke="#7fa7d6" stroke-dasharray="500 150 80 150" ${sw(0.7)}/>`);
      out.push(`<circle cx="${x}" cy="${gy0}" r="450" fill="#fff" stroke="#3f72b5" ${sw(1)}/>` + utext(x, gy0, k, 420, 'fill="#3f72b5"', vr));
    }
    for (const k in G.y) {
      const y = G.y[k];
      out.push(`<line x1="${gx0 + 450}" y1="${y}" x2="${gx1}" y2="${y}" stroke="#7fa7d6" stroke-dasharray="500 150 80 150" ${sw(0.7)}/>`);
      out.push(`<circle cx="${gx0}" cy="${y}" r="450" fill="#fff" stroke="#3f72b5" ${sw(1)}/>` + utext(gx0, y, k, 420, 'fill="#3f72b5"', vr));
    }
    // context rooms
    for (const r of PAC.CONTEXT_ROOMS) {
      out.push(rect(r, `fill="#eceef1" stroke="#b9bec6" ${sw(1)}`));
      const words = r.name.split(' / ');
      const size = Math.min(320, ((sideways ? r.h : r.w) * 0.85) / (Math.max.apply(null, words.map(w => w.length)) * 0.55));
      const up = upVec(vr);
      words.forEach((w, i) => { const off = -(i - (words.length - 1) / 2) * size * 1.2; out.push(utext(r.x + r.w / 2 + up[0] * off, r.y + r.h / 2 + up[1] * off, w, Math.round(size), 'fill="#8b919a"', vr)); });
    }
    // usable rooms
    const rooms = PAC.usableRooms(settings);
    for (const r of rooms) out.push(rect(r, `fill="${r.floor}" stroke="none"`));
    // retractable seating
    out.push(PAC.renderRetractable(settings, o));
    // walls (outline of usable rooms)
    for (const r of rooms) out.push(rect(r, `fill="none" stroke="#2b2f36" stroke-width="200"`));
    // operable wall
    const W = PAC.OPERABLE_WALL;
    if (settings.operableWall === 'in') {
      out.push(rect(W, 'fill="#2b2f36"'));
      if (!sideways) out.push(utext(W.x + W.w / 2, W.y - 250, 'OPERABLE WALL (IN)', 230, 'fill="#4b5563"', vr));
    } else {
      out.push(rect(W, `fill="none" stroke="#6b7280" stroke-dasharray="200 150" ${sw(1)}`));
      out.push(rect(W.stack, `fill="#6b7280" stroke="#2b2f36" ${sw(1)}`));
      if (!sideways) out.push(utext(W.x + W.w / 2, W.y - 250, 'OPERABLE WALL OUT (STACKED)', 230, 'fill="#6b7280"', vr));
    }
    // proscenium
    for (const p of PAC.PROSCENIUM) out.push(rect(p, 'fill="#2b2f36"'));
    // doors
    for (const d of PAC.DOORS) {
      const g = PAC.doorGeom(d, PAC.RULES.minCrossOver);
      if (!g) continue;
      const floor = PAC.doorFloor(d, settings), side = g.hw.side;
      if (d.egress && o.mode === 'screen') out.push(rect(g.zone, `fill="#22c55e" fill-opacity="0.08" stroke="#16a34a" stroke-opacity="0.5" stroke-dasharray="120 120" ${sw(1)}`));
      const pad = g.hw.horiz ? { x: g.gap.x - 1, y: g.gap.y - 30, w: g.gap.w + 2, h: g.gap.h + 60 } : { x: g.gap.x - 30, y: g.gap.y - 1, w: g.gap.w + 60, h: g.gap.h + 2 };
      out.push(rect(pad, `fill="${floor}"`));
      const cx = g.gap.x + g.gap.w / 2, cy = g.gap.y + g.gap.h / 2;
      out.push(PAC.doorSymbol(d, cx, cy, sw, side, g.hw.thick));
      if (d.egress) {
        const ov = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[side];
        out.push(`<g transform="translate(${cx + ov[0] * 1200} ${cy + ov[1] * 1200}) rotate(${-vr})"><rect x="-330" y="-150" width="660" height="300" rx="40" fill="#16a34a"/><text x="0" y="70" font-size="200" text-anchor="middle" fill="#fff" font-weight="bold" ${F}>EXIT</text></g>`);
      }
    }
    // room labels
    for (const r of rooms) {
      const across = sideways ? r.h : r.w, along = sideways ? r.w : r.h, name = r.name.toUpperCase();
      const size = Math.min(600, across * 0.9 / (name.length * 0.66));
      const up = upVec(vr), d1 = along / 2 - 900, d2 = d1 - 650;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      out.push(utext(cx + up[0] * d1, cy + up[1] * d1, name, Math.round(size), 'fill="#5d5240" fill-opacity="0.75" font-weight="bold" letter-spacing="30"', vr));
      const sub = [r.area ? r.area.toFixed(1) + ' m²' : '', r.sub].filter(Boolean).join(' · ');
      out.push(utext(cx + up[0] * d2, cy + up[1] * d2, sub, 300, 'fill="#5d5240" fill-opacity="0.7"', vr));
    }
    // north arrow
    out.push(`<g transform="translate(53800 22300)"><circle r="900" fill="#fff" stroke="#2b2f36" ${sw(1)}/><path d="M0 -800 L350 500 L0 250 L-350 500 Z" fill="#2b2f36"/>${text(0, -1050, 'N', 500, 'fill="#2b2f36" font-weight="bold"')}</g>`);
    return out.join('');
  };

  PAC.renderRetractable = function (settings, o) {
    const sw = o.sw, RS = PAC.RETRACTABLE, s = [];
    if (settings.retractable === 'out') {
      // rows run across the bank (along y); row A (front) is on the stage side (east, +x)
      const r = RS.out, rows = RS.rows, n = Math.max(1, rows.length), pitch = r.w / n, vr = o.viewRot || 0;
      const units = Math.max(1, ...rows.map(row => row.blocks.reduce((a, b) => a + Math.abs(b), 0)));
      const seatW = r.h / units, depth = Math.min(pitch * 0.62, 520);
      s.push(rect(r, `fill="#e5e7eb" stroke="#4b5563" ${sw(1)}`));
      rows.forEach((row, i) => {
        const x = r.x + r.w - (i + 0.5) * pitch, rowUnits = row.blocks.reduce((a, b) => a + Math.abs(b), 0);
        let u = (units - rowUnits) / 2; // centre shorter rows
        s.push(`<rect x="${(x - pitch / 2).toFixed(0)}" y="${r.y}" width="${pitch.toFixed(0)}" height="${r.h}" fill="none" stroke="#c4cad3" ${sw(0.5)}/>`); // tier edge
        for (const b of row.blocks) {
          if (b > 0) for (let k = 0; k < b; k++, u++) s.push(`<rect x="${(x - depth / 2).toFixed(0)}" y="${(r.y + u * seatW + seatW * 0.08).toFixed(0)}" width="${depth.toFixed(0)}" height="${(seatW * 0.84).toFixed(0)}" rx="${(seatW * 0.12).toFixed(0)}" fill="#7f8ba0"/>`);
          else u += -b;
        }
        // row letters at both ends of the bank, upright on screen
        const ls = Math.min(300, pitch * 0.45);
        s.push(utext(x, r.y - ls * 1.1, row.label, ls.toFixed(0), 'fill="#374151" font-weight="bold"', vr));
        s.push(utext(x, r.y + r.h + ls * 1.1, row.label, ls.toFixed(0), 'fill="#374151" font-weight="bold"', vr));
      });
      // title runs along the first aisle (rows that have one), else across the middle
      const front = rows[0] ? rows[0].blocks : [];
      let u = 0, aisleMid = null;
      for (const b of front) { if (b < 0) { aisleMid = u - b / 2; break; } u += Math.abs(b); }
      const frontUnits = front.reduce((a, b) => a + Math.abs(b), 0);
      let withAisle = 0; while (withAisle < rows.length && rows[withAisle].blocks.some(b => b < 0)) withAisle++;
      const la = vr === 180 || vr === 270 ? 180 : 0;
      if (aisleMid != null && withAisle) {
        const cy = r.y + ((units - frontUnits) / 2 + aisleMid) * seatW, cx = r.x + r.w - withAisle * pitch / 2;
        const fs = Math.min(seatW * 0.9, 300, (withAisle * pitch * 0.9) / 16);
        s.push(`<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) rotate(${la})">${text(0, (fs * 0.35).toFixed(0), `RETRACTABLE SEATING (${RS.seats})`, fs.toFixed(0), 'fill="#1f2937" font-weight="bold"')}</g>`);
      } else {
        s.push(`<g transform="translate(${r.x + r.w / 2} ${r.y + r.h / 2}) rotate(${la - 90})"><rect x="-3000" y="-300" width="6000" height="520" rx="100" fill="#fff" fill-opacity="0.9"/>${text(0, 60, `RETRACTABLE SEATING (${RS.seats})`, 260, 'fill="#1f2937" font-weight="bold"')}</g>`);
      }
    } else {
      const r = RS.stowed;
      s.push(rect(r, `fill="#9ca3af" stroke="#4b5563" ${sw(1)}`));
      for (let y = r.y + 400; y < r.y + r.h; y += 400) s.push(`<line x1="${r.x}" y1="${y}" x2="${r.x + r.w}" y2="${y - 400}" stroke="#6b7280" ${sw(0.6)}/>`);
      const la = (o.viewRot || 0) === 270 ? 90 : -90;
      s.push(`<g transform="translate(${r.x + r.w / 2} ${r.y + r.h / 2}) rotate(${la})">${text(0, 100, 'RETRACTABLE SEATING — STOWED', 300, 'fill="#fff" font-weight="bold"')}</g>`);
    }
    return s.join('');
  };

  /* Fixed screens: a bar when down, nothing when up. o.all = draw every screen (editor preview). */
  PAC.renderScreens = function (settings, o) {
    const out = [], vr = o.viewRot || 0;
    for (const sc of PAC.SCREENS || []) {
      const down = o.all || PAC.screenDown(settings, sc);
      if (!down) continue;
      const horiz = sc.w >= sc.h, len = horiz ? sc.w : sc.h, t = Math.max(120, horiz ? sc.h : sc.w);
      const cx = sc.x + sc.w / 2, cy = sc.y + sc.h / 2;
      out.push(`<rect x="${sc.x}" y="${sc.y}" width="${sc.w}" height="${sc.h}" fill="#1e3a8a" stroke="#0b1b46" ${o.sw(1)}/>`);
      // ticks at each end so the bar reads as a screen
      const ends = horiz ? [[sc.x, cy], [sc.x + sc.w, cy]] : [[cx, sc.y], [cx, sc.y + sc.h]];
      for (const [ex, ey] of ends) out.push(`<rect x="${ex - (horiz ? 40 : t * 1.5)}" y="${ey - (horiz ? t * 1.5 : 40)}" width="${horiz ? 80 : t * 3}" height="${horiz ? t * 3 : 80}" fill="#1e3a8a"/>`);
      const size = Math.min(320, len / 8);
      out.push(`<g transform="translate(${cx} ${cy}) rotate(${-vr})"><rect x="${-size * 2.6}" y="${-size * 0.75}" width="${size * 5.2}" height="${size * 1.5}" rx="${size * 0.3}" fill="#ffffff" fill-opacity="0.92" stroke="#1e3a8a" ${o.sw(0.8)}/><text x="0" y="${size * 0.35}" font-size="${size}" text-anchor="middle" font-weight="bold" fill="#1e3a8a" ${F}>SCREEN</text></g>`);
    }
    return out.join('');
  };

  /* Numbering of AV items (HH1, HH2...). */
  PAC.avNumbers = function (items) {
    const n = {}, map = new Map();
    for (const it of items) if (PAC.CATALOG[it.type] && PAC.CATALOG[it.type].draw === 'mic') { n[it.type] = (n[it.type] || 0) + 1; map.set(it.id, n[it.type]); }
    return map;
  };

  PAC.renderItems = function (items, o) {
    const nums = PAC.avNumbers(items);
    const opts = { sw: o.sw, viewRot: o.viewRot || 0, linkColor: PAC.linkColor, avNumber: it => nums.get(it.id) || '' };
    const sorted = items.slice().sort((a, b) => PAC.CATALOG[a.type].z - PAC.CATALOG[b.type].z);
    return sorted.map(it => `<g ${o.mode === 'screen' ? `class="item" data-id="${it.id}"` : ''} transform="translate(${Math.round(it.x)} ${Math.round(it.y)}) rotate(${it.rot || 0})">${PAC.drawItem(it, opts)}</g>`).join('');
  };

  /* ---------------- export (PDF / PNG / print) ---------------- */
  const PAPER = { A3: [420, 297], A4: [297, 210] };
  const SCALES = [100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 1500];

  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }
  PAC.fmtDate = fmtDate;

  function wrap(str, maxChars) {
    const out = [];
    for (const para of String(str).split('\n')) {
      let line = '';
      for (const w of para.split(/\s+/)) {
        if (!w) continue;
        if ((line + ' ' + w).trim().length > maxChars && line) { out.push(line); line = w; }
        else line = (line + ' ' + w).trim();
      }
      out.push(line);
    }
    return out;
  }

  /* Text summary sections shared by export & UI. */
  PAC.summarySections = function (state, analysis) {
    const m = state.meta, S = state.settings, c = analysis.counts, I = PAC.CATALOG;
    const retSeats = S.retractable === 'out' ? PAC.RETRACTABLE.seats : 0;
    const loose = c.chair || 0, atT = analysis.atTable.size;
    const time = [m.start, m.end].filter(Boolean).join(' – ');
    const lim = t => I[t].max == null ? '' : ` / ${I[t].max}`;
    const sections = [];
    sections.push({ title: 'Event', lines: [
      { t: m.name || 'Untitled event', b: true },
      { t: [fmtDate(m.date), time].filter(Boolean).join(', ') || 'Date not set' },
      { t: 'Run by: ' + (m.runBy || '—') },
    ] });
    sections.push({ title: 'Setup', lines: [
      { t: `Retractable seating: ${S.retractable === 'out' ? 'OUT (' + PAC.RETRACTABLE.seats + ' seats)' : 'IN (stowed)'}` },
      { t: `LC operable wall: ${S.operableWall === 'in' ? 'IN — two rooms' : 'OUT — one large room'}` },
      ...PAC.SCREENS.map(sc => ({ t: `${sc.name}: ${PAC.screenDown(S, sc) ? 'DOWN' : 'up'}` })),
      { t: `Seating capacity: ${retSeats + loose}`, b: true },
      { t: `  retractable ${retSeats} + chairs ${loose}${atT ? ` (${atT} at tables)` : ''}` },
    ] });
    // one checklist section per category (text labels aren't equipment)
    for (const cat of PAC.CATEGORY_ORDER) {
      const types = Object.keys(I).filter(t => I[t].cat === cat && I[t].draw !== 'label');
      if (!types.length) continue;
      sections.push({ title: cat, lines: types.map(t => ({
        t: `${I[t].name}: ${c[t] || 0}${lim(t)}${I[t].cloth ? `  · cloths ${c['cloth:' + t] || 0}` : ''}`, box: true, on: (c[t] || 0) > 0,
      })) });
    }
    const iss = analysis.issues;
    const errs = iss.filter(i => i.level === 'error').length, warns = iss.length - errs;
    const cl = [];
    if (!iss.length) cl.push({ t: 'No issues found (NSW I4D18–I4D23).' });
    else {
      cl.push({ t: `${errs} issue${errs === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'}`, b: true });
      iss.slice(0, 6).forEach(i => cl.push({ t: `• [${i.rule}] ${i.msg}` }));
      if (iss.length > 6) cl.push({ t: `• …and ${iss.length - 6} more` });
    }
    sections.push({ title: 'Seating compliance', lines: cl });
    if (m.notes) sections.push({ title: 'Notes', lines: [{ t: m.notes }] });
    return sections;
  };

  PAC.buildExportSvg = function (state, analysis, paperName) {
    const [W, H] = PAPER[paperName] || PAPER.A3;
    const rot = state.settings.viewRot || 0;
    const margin = 10, small = paperName === 'A4';
    const fs = small ? 2.5 : 3.1, lh = fs * 1.35;
    const vertical = rot % 180 !== 0;
    // regions
    const header = small ? 13 : 16;
    let plan, block, cols;
    if (!vertical) {
      const bh = small ? 60 : 68;
      plan = { x: margin, y: margin + header, w: W - 2 * margin, h: H - 2 * margin - header - bh - 4 };
      block = { x: margin, y: H - margin - bh, w: W - 2 * margin, h: bh }; cols = 4;
    } else {
      const bw = small ? 100 : 130;
      plan = { x: margin, y: margin + header, w: W - 2 * margin - bw - 6, h: H - 2 * margin - header };
      block = { x: W - margin - bw, y: margin + header, w: bw, h: H - 2 * margin - header }; cols = small ? 1 : 2;
    }
    const E = PAC.EXTENTS, C = PAC.CENTER;
    const RB = vertical ? { x: C.x - E.h / 2, y: C.y - E.w / 2, w: E.h, h: E.w } : { x: E.x, y: E.y, w: E.w, h: E.h };
    const fit = Math.min(plan.w / RB.w, plan.h / RB.h);
    const den = SCALES.find(d => 1 / d <= fit) || Math.ceil(1 / fit);
    const k = 1 / den;
    const tx = plan.x + (plan.w - RB.w * k) / 2 - RB.x * k, ty = plan.y + (plan.h - RB.h * k) / 2 - RB.y * k;
    const o = { mode: 'export', sw: PAC.strokeFn('export', den), viewRot: rot };

    const s = [];
    s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`);
    s.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
    // header
    const m = state.meta;
    s.push(`<text x="${margin}" y="${margin + fs * 2}" font-size="${fs * 2}" font-weight="bold" fill="#14284b" ${F}>${esc(m.name || 'Untitled event')}</text>`);
    const subtitle = [fmtDate(m.date), [m.start, m.end].filter(Boolean).join(' – '), m.runBy ? 'Run by ' + m.runBy : ''].filter(Boolean).join('   ·   ');
    s.push(`<text x="${margin}" y="${margin + fs * 2 + lh * 1.2}" font-size="${fs * 1.05}" fill="#374151" ${F}>${esc(subtitle)}</text>`);
    s.push(`<text x="${W - margin}" y="${margin + fs * 1.6}" font-size="${fs}" text-anchor="end" font-weight="bold" fill="#14284b" ${F}>GPHS Performing Arts Centre — Event Layout</text>`);
    s.push(`<text x="${W - margin}" y="${margin + fs * 1.6 + lh}" font-size="${fs * 0.85}" text-anchor="end" fill="#6b7280" ${F}>Scale 1:${den} @ ${paperName} · printed ${new Date().toLocaleDateString('en-AU')}</text>`);
    s.push(`<line x1="${margin}" y1="${margin + header - 2}" x2="${W - margin}" y2="${margin + header - 2}" stroke="#14284b" stroke-width="0.4"/>`);
    // plan
    s.push(`<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${k})"><g transform="rotate(${rot} ${C.x} ${C.y})">`);
    s.push(PAC.renderBase(state.settings, o));
    s.push(PAC.renderItems(state.items, o));
    s.push(PAC.renderScreens(state.settings, o));
    s.push('</g></g>');
    // scale bar (10 m)
    const sbLen = 10000 * k, sbx = plan.x + 2, sby = plan.y + plan.h - 3;
    s.push(`<g>${[0, 1, 2, 3, 4].map(i => `<rect x="${sbx + i * sbLen / 5}" y="${sby - 1.6}" width="${sbLen / 5}" height="1.6" fill="${i % 2 ? '#fff' : '#111'}" stroke="#111" stroke-width="0.2"/>`).join('')}
      <text x="${sbx}" y="${sby - 2.4}" font-size="${fs * 0.8}" fill="#111" ${F}>0</text>
      <text x="${sbx + sbLen}" y="${sby - 2.4}" font-size="${fs * 0.8}" text-anchor="middle" fill="#111" ${F}>10 m</text></g>`);
    // title block
    s.push(`<rect x="${block.x}" y="${block.y}" width="${block.w}" height="${block.h}" fill="#f7f8fa" stroke="#14284b" stroke-width="0.3"/>`);
    const sections = PAC.summarySections(state, analysis);
    const pad = 3, colW = (block.w - pad * (cols + 1)) / cols;
    const maxChars = Math.floor(colW / (fs * 0.5));
    let col = 0, y = block.y + pad + fs;
    const colX = () => block.x + pad + col * (colW + pad);
    const bottom = block.y + block.h - pad - lh * 2.2;
    for (const sec of sections) {
      const lines = [];
      for (const ln of sec.lines) wrap(ln.t, maxChars - (ln.box ? 3 : 0)).forEach((t, i) => lines.push({ t, b: ln.b, box: ln.box && i === 0, on: ln.on, indent: ln.box }));
      const need = lh * (lines.length + 1.3);
      if (y + need > bottom && col < cols - 1 && y > block.y + pad + fs) { col++; y = block.y + pad + fs; }
      const x = colX();
      s.push(`<text x="${x}" y="${y}" font-size="${fs * 0.95}" font-weight="bold" fill="#14284b" ${F}>${esc(sec.title.toUpperCase())}</text>`);
      y += lh * 1.15;
      for (const ln of lines) {
        if (y > bottom + lh) break;
        let tx2 = x;
        if (ln.box) s.push(`<rect x="${x}" y="${y - fs * 0.8}" width="${fs * 0.85}" height="${fs * 0.85}" fill="${ln.on ? '#fff' : '#eef0f3'}" stroke="#374151" stroke-width="0.2"/>`);
        if (ln.indent) tx2 = x + fs * 1.4;
        s.push(`<text x="${tx2}" y="${y}" font-size="${fs * 0.88}" ${ln.b ? 'font-weight="bold"' : ''} fill="${ln.indent && !ln.on ? '#9ca3af' : '#1f2937'}" ${F}>${esc(ln.t)}</text>`);
        y += lh;
      }
      y += lh * 0.45;
    }
    const disc = wrap('Planning aid only. Plan traced from BKA A111 Rev 10 (approx.). Seating checks per NCC 2022 NSW Part I4 — confirm on site.', Math.floor((block.w - 2 * pad) / (fs * 0.72 * 0.5)));
    disc.forEach((t, i) => s.push(`<text x="${block.x + pad}" y="${block.y + block.h - pad - (disc.length - 1 - i) * fs * 0.95}" font-size="${fs * 0.72}" fill="#6b7280" ${F}>${esc(t)}</text>`));
    s.push('</svg>');
    return { svg: s.join(''), W, H, den };
  };
})();
