/* GPHS PAC Event Layout — application controller. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const svg = $('plan'), viewRoot = $('viewRoot'), layerBase = $('layerBase'), layerItems = $('layerItems'), layerOverlay = $('layerOverlay');
  const wrapEl = $('canvasWrap');
  const C = PAC.CENTER, E = PAC.EXTENTS;
  const screenStroke = PAC.strokeFn('screen');

  /* ---------------- state ---------------- */
  const state = {
    meta: { name: '', date: '', start: '', end: '', runBy: '', notes: '' },
    settings: { retractable: 'in', operableWall: 'in', viewRot: 0, screens: {} },
    items: [],
  };
  let sel = new Set();
  let analysis = null;
  const undoStack = [], redoStack = [];
  let view = { x: E.x, y: E.y, w: E.w, h: E.h };
  let mode = 'select', placeType = null;
  let measure = null; // {a:{x,y}, b:{x,y}|null, cur}
  let baseKey = '';

  const serialize = () => ({ app: 'gphs-pac-layout', version: 1, meta: Object.assign({}, state.meta), settings: Object.assign({}, state.settings), items: state.items.map(i => Object.assign({}, i)) });
  const snapKey = () => JSON.stringify({ s: { retractable: state.settings.retractable, operableWall: state.settings.operableWall, screens: Object.assign({}, state.settings.screens) }, i: state.items });

  function snapshot() { undoStack.push(snapKey()); if (undoStack.length > 150) undoStack.shift(); redoStack.length = 0; }
  function restore(str) { const d = JSON.parse(str); Object.assign(state.settings, d.s); state.items = d.i; sel = new Set([...sel].filter(id => state.items.some(i => i.id === id))); changed(); }
  function undo() { if (!undoStack.length) return toast('Nothing to undo'); redoStack.push(snapKey()); restore(undoStack.pop()); }
  function redo() { if (!redoStack.length) return toast('Nothing to redo'); undoStack.push(snapKey()); restore(redoStack.pop()); }

  function changed(opts) {
    analysis = PAC.checkLayout(state);
    render();
    updatePanels();
    if (!opts || !opts.noSave) PAC.store.saveCurrent(serialize());
  }

  const byId = id => state.items.find(i => i.id === id);
  const selected = () => state.items.filter(i => sel.has(i.id));
  const snapVal = () => +$('snap').value || 0;
  const snap = v => { const s = snapVal(); return s ? Math.round(v / s) * s : Math.round(v); };
  const count = t => state.items.filter(i => i.type === t).length;
  const remaining = t => { const m = PAC.CATALOG[t].max; return m == null ? Infinity : m - count(t); };

  /* ---------------- view ---------------- */
  function clientSize() { const r = svg.getBoundingClientRect(); return { w: Math.max(1, r.width), h: Math.max(1, r.height) }; }
  function rotatedBounds() {
    const rot = state.settings.viewRot;
    return rot % 180 ? { x: C.x - E.h / 2, y: C.y - E.w / 2, w: E.h, h: E.w } : { x: E.x, y: E.y, w: E.w, h: E.h };
  }
  function applyView() {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    viewRoot.setAttribute('transform', `rotate(${state.settings.viewRot} ${C.x} ${C.y})`);
    updateScalebar();
  }
  function fit() {
    const b = rotatedBounds(), cs = clientSize(), pad = 800;
    const bw = b.w + pad * 2, bh = b.h + pad * 2;
    const aspect = cs.w / cs.h;
    let w = bw, h = bw / aspect;
    if (h < bh) { h = bh; w = bh * aspect; }
    view = { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
    applyView();
  }
  function onResize() {
    const cs = clientSize(), cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    view.h = view.w * cs.h / cs.w; view.x = cx - view.w / 2; view.y = cy - view.h / 2;
    applyView();
  }
  function zoomAt(f, clientX, clientY) {
    const r = svg.getBoundingClientRect();
    const px = clientX == null ? 0.5 : (clientX - r.left) / r.width, py = clientY == null ? 0.5 : (clientY - r.top) / r.height;
    const ux = view.x + px * view.w, uy = view.y + py * view.h;
    const nw = Math.max(1500, Math.min(250000, view.w * f)), k = nw / view.w;
    view.w = nw; view.h *= k; view.x = ux - px * view.w; view.y = uy - py * view.h;
    applyView();
  }
  function toWorld(clientX, clientY) {
    const m = viewRoot.getScreenCTM().inverse();
    const p = new DOMPoint(clientX, clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  }
  function toClient(x, y) { const p = new DOMPoint(x, y).matrixTransform(viewRoot.getScreenCTM()); return { x: p.x, y: p.y }; }
  function viewCentreWorld() { const r = svg.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); }
  function rotateView(d) {
    const c = viewCentreWorld();
    state.settings.viewRot = (((state.settings.viewRot + d) % 360) + 360) % 360;
    fit(); void c;
    updateViewLabel(); render();
    PAC.store.saveCurrent(serialize());
  }
  function updateViewLabel() {
    const side = { 0: 'right', 90: 'bottom', 180: 'left', 270: 'top' }[state.settings.viewRot];
    $('viewLabel').textContent = 'Stage: ' + side;
  }
  function updateScalebar() {
    const pxPerMm = clientSize().w / view.w;
    const opts = [1, 2, 5, 10, 20, 50].map(m => m * 1000);
    let len = opts[0]; for (const o of opts) { if (o * pxPerMm <= 170) len = o; }
    const bar = document.querySelector('#scalebar .sb-bar');
    bar.style.width = (len * pxPerMm).toFixed(0) + 'px';
    document.querySelector('#scalebar .sb-label').textContent = (len / 1000) + ' m';
  }

  /* ---------------- rendering ---------------- */
  function render() {
    const key = state.settings.retractable + state.settings.operableWall + state.settings.viewRot;
    if (key !== baseKey) { layerBase.innerHTML = PAC.renderBase(state.settings, { mode: 'screen', sw: screenStroke, viewRot: state.settings.viewRot }); baseKey = key; }
    renderItemsLayer();
    renderOverlay();
  }
  function renderItemsLayer() {
    layerItems.innerHTML = PAC.renderItems(state.items, { mode: 'screen', sw: screenStroke, viewRot: state.settings.viewRot }) +
      `<g pointer-events="none">${PAC.renderScreens(state.settings, { sw: screenStroke, viewRot: state.settings.viewRot })}</g>`;
  }
  /* Linked chairs act as one group. */
  function groupIds(id) {
    const it = byId(id);
    if (!it || it.type !== 'chair' || !it.link) return [id];
    return state.items.filter(i => i.type === 'chair' && i.link === it.link).map(i => i.id);
  }
  function expandGroups(ids) { const out = new Set(); for (const id of ids) groupIds(id).forEach(g => out.add(g)); return out; }
  function poly(P, attrs) { return `<polygon points="${P.map(p => p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' ')}" ${attrs}/>`; }
  function renderOverlay() {
    const s = [];
    if (analysis) {
      const lvl = new Map();
      for (const is of analysis.issues) for (const id of is.ids) if (lvl.get(id) !== 'error') lvl.set(id, is.level);
      for (const [id, l] of lvl) { const it = byId(id); if (it) s.push(poly(PAC.itemCorners(it, 40), `fill="${l === 'error' ? '#ef4444' : '#f59e0b'}" fill-opacity="0.18" stroke="${l === 'error' ? '#dc2626' : '#d97706'}" ${screenStroke(1.5)} pointer-events="none"`)); }
    }
    const grouped = new Set(), groups = {};
    for (const id of sel) { const it = byId(id); if (it && it.type === 'chair' && it.link) (groups[it.link] = groups[it.link] || []).push(it); }
    for (const link in groups) {
      const members = groups[link];
      if (members.length !== groupIds(members[0].id).length) continue; // only part of the group is selected
      const a = (members[0].rot || 0) * Math.PI / 180, ux = [Math.cos(a), Math.sin(a)], fx = [-Math.sin(a), Math.cos(a)];
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const m of members) for (const p of PAC.itemCorners(m, 0)) {
        const u = p[0] * ux[0] + p[1] * ux[1], v = p[0] * fx[0] + p[1] * fx[1];
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
      }
      const pad = 120; u0 -= pad; u1 += pad; v0 -= pad; v1 += pad;
      const P = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [u * ux[0] + v * fx[0], u * ux[1] + v * fx[1]]);
      s.push(poly(P, `fill="#2563eb" fill-opacity="0.06" stroke="#2563eb" ${screenStroke(2)} pointer-events="none"`));
      members.forEach(m => grouped.add(m.id));
    }
    for (const id of sel) { if (grouped.has(id)) continue; const it = byId(id); if (it) s.push(poly(PAC.itemCorners(it, 90), `fill="none" stroke="#2563eb" ${screenStroke(2)} stroke-dasharray="6 3" vector-effect="non-scaling-stroke" pointer-events="none"`)); }
    if (measure && measure.a) {
      const b = measure.b || measure.cur;
      if (b) {
        const d = Math.hypot(b.x - measure.a.x, b.y - measure.a.y);
        const mx = (measure.a.x + b.x) / 2, my = (measure.a.y + b.y) / 2;
        const fsz = view.w / 60;
        s.push(`<line x1="${measure.a.x}" y1="${measure.a.y}" x2="${b.x}" y2="${b.y}" stroke="#db2777" ${screenStroke(2)} pointer-events="none"/>`);
        s.push(`<circle cx="${measure.a.x}" cy="${measure.a.y}" r="${fsz / 4}" fill="#db2777"/><circle cx="${b.x}" cy="${b.y}" r="${fsz / 4}" fill="#db2777"/>`);
        s.push(`<g transform="translate(${mx} ${my}) rotate(${-state.settings.viewRot})" pointer-events="none"><rect x="${-fsz * 2.4}" y="${-fsz * 1.5}" width="${fsz * 4.8}" height="${fsz * 1.3}" rx="${fsz * 0.3}" fill="#db2777"/><text y="${-fsz * 0.5}" font-size="${fsz}" text-anchor="middle" fill="#fff" ${PAC.FONT}>${(d / 1000).toFixed(2)} m</text></g>`);
      }
    }
    if (boxSel) {
      // box drawn in client space; convert the 4 client corners to world
      const P = [[boxSel.x0, boxSel.y0], [boxSel.x1, boxSel.y0], [boxSel.x1, boxSel.y1], [boxSel.x0, boxSel.y1]].map(p => { const w = toWorld(p[0], p[1]); return [w.x, w.y]; });
      s.push(poly(P, `fill="#3b82f6" fill-opacity="0.08" stroke="#2563eb" ${screenStroke(1)} pointer-events="none"`));
    }
    layerOverlay.innerHTML = s.join('');
  }

  /* ---------------- panels ---------------- */
  function buildPalette() {
    const p = $('paletteBody');
    const html = [];
    for (const cat of PAC.CATEGORY_ORDER) {
      html.push(`<h3>${cat}</h3><div class="pal-group">`);
      for (const t in PAC.CATALOG) {
        const c = PAC.CATALOG[t];
        if (c.cat !== cat) continue;
        html.push(`<button class="pal-item" draggable="true" data-type="${t}" title="${PAC.esc(c.desc || c.name)}">
          <span class="pal-icon">${PAC.paletteIcon(t)}</span>
          <span class="pal-text"><span class="pal-name">${c.name}</span><span class="pal-count" data-count="${t}"></span></span></button>`);
      }
      if (cat === 'Seating') html.push(`<button class="pal-item pal-block" id="btnBlock"><span class="pal-icon">▦</span><span class="pal-text"><span class="pal-name">Block of chairs…</span><span class="pal-count">rows, aisles, auto-linked</span></span></button>`);
      html.push('</div>');
    }
    html.push(`<p class="small muted pal-foot">Drag onto the plan, or click then click the plan. Items can go in the Auditorium, Stage and Learning Centres.</p>`);
    p.innerHTML = html.join('');
    p.querySelectorAll('.pal-item[data-type]').forEach(b => {
      b.addEventListener('click', () => { if (placeType === b.dataset.type) setMode('select'); else setMode('place', b.dataset.type); });
      b.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', 'pac:' + b.dataset.type); e.dataTransfer.effectAllowed = 'copy'; });
    });
    $('btnBlock').addEventListener('click', openBlockDialog);
  }

  function updatePanels() {
    const c = analysis.counts;
    // palette counts
    document.querySelectorAll('[data-count]').forEach(el => {
      const t = el.dataset.count, max = PAC.CATALOG[t].max, n = c[t] || 0;
      el.textContent = max == null ? (n ? n + ' placed' : '') : `${n} / ${max}`;
      el.closest('.pal-item').classList.toggle('exhausted', max != null && n >= max);
      el.closest('.pal-item').classList.toggle('active', placeType === t);
    });
    // inventory
    const I = PAC.CATALOG, rows = [];
    const bar = (n, max) => max == null ? '' : `<span class="bar"><span style="width:${Math.min(100, n / max * 100)}%" class="${n > max ? 'over' : ''}"></span></span>`;
    const row = (label, n, max) => `<tr><td>${label}</td><td class="num ${max != null && n > max ? 'over' : ''}">${n}${max != null ? ' / ' + max : ''}</td><td>${bar(n, max)}</td></tr>`;
    for (const cat of PAC.CATEGORY_ORDER) {
      const types = Object.keys(I).filter(t => I[t].cat === cat && I[t].draw !== 'label');
      if (!types.length) continue;
      rows.push(`<tr class="inv-cat"><td colspan="3">${PAC.esc(cat)}</td></tr>`);
      for (const t of types) {
        rows.push(row(PAC.esc(I[t].name), c[t] || 0, I[t].max));
        if (I[t].cloth) rows.push(row('&nbsp;&nbsp;black cloths', c['cloth:' + t] || 0, I[t].max));
      }
    }
    const ret = state.settings.retractable === 'out' ? PAC.RETRACTABLE.seats : 0;
    const loose = c.chair || 0;
    $('invBody').innerHTML = `<div class="capacity"><div><b>${ret + loose}</b><span>seats total</span></div><div><b>${ret}</b><span>retractable</span></div><div><b>${loose}</b><span>chairs</span></div></div>
      <table class="inv">${rows.join('')}</table>
      <div class="inv-actions"><button class="btn small" id="clothAll">Cloth on all tables</button><button class="btn small" id="clothNone">Remove cloths</button></div>`;
    $('clothAll').onclick = () => setCloth(state.items.filter(i => PAC.CATALOG[i.type].cloth), true);
    $('clothNone').onclick = () => setCloth(state.items.filter(i => PAC.CATALOG[i.type].cloth), false);

    // fixed screens
    const scr = PAC.SCREENS || [];
    $('screensCard').hidden = !scr.length;
    $('screensBody').innerHTML = scr.map(sc => {
      const down = PAC.screenDown(state.settings, sc);
      return `<div class="screen-row"><span>${PAC.esc(sc.name)}</span><div class="seg"><button class="seg-btn ${down ? '' : 'on'}" data-scr="${PAC.esc(sc.id)}" data-v="up">Up</button><button class="seg-btn ${down ? 'on' : ''}" data-scr="${PAC.esc(sc.id)}" data-v="down">Down</button></div></div>`;
    }).join('');
    $('screensBody').querySelectorAll('[data-scr]').forEach(b => b.onclick = () => {
      const id = b.dataset.scr, v = b.dataset.v;
      if ((state.settings.screens[id] === 'down') === (v === 'down')) return;
      snapshot(); state.settings.screens = Object.assign({}, state.settings.screens, { [id]: v }); changed();
    });

    // compliance
    const iss = analysis.issues, errs = iss.filter(i => i.level === 'error').length;
    const badge = $('compBadge');
    badge.textContent = iss.length ? `${errs} issue${errs === 1 ? '' : 's'}${iss.length - errs ? ' · ' + (iss.length - errs) + ' warn' : ''}` : '✓ OK';
    badge.className = 'badge ' + (errs ? 'bad' : iss.length ? 'warn' : 'ok');
    $('compList').innerHTML = iss.length ? iss.map((is, k) => `<li class="${is.level}" data-k="${k}"><span class="rule">${PAC.esc(is.rule)}</span>${PAC.esc(is.msg)}</li>`).join('')
      : `<li class="ok-msg">No problems found${(c.chair || 0) ? ` for ${c.chair} chair${c.chair > 1 ? 's' : ''}` : ''}.</li>`;
    $('compList').querySelectorAll('li[data-k]').forEach(li => li.onclick = () => {
      const is = analysis.issues[+li.dataset.k];
      if (is.ids.length) { sel = new Set(is.ids); zoomToItems(is.ids); render(); updateSelPanel(); }
    });
    // toggles
    document.querySelectorAll('[data-ret]').forEach(b => b.classList.toggle('on', b.dataset.ret === state.settings.retractable));
    document.querySelectorAll('[data-wall]').forEach(b => b.classList.toggle('on', b.dataset.wall === state.settings.operableWall));
    $('btnUndo').disabled = !undoStack.length; $('btnRedo').disabled = !redoStack.length;
    updateSelPanel();
  }

  function zoomToItems(ids) {
    const pts = []; ids.forEach(id => { const it = byId(id); if (it) PAC.itemCorners(it).forEach(p => { const c = toClient(p[0], p[1]); pts.push(c); }); });
    if (!pts.length) return;
    const r = svg.getBoundingClientRect();
    const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    const f = Math.max((x1 - x0 + 160) / r.width, (y1 - y0 + 160) / r.height, 0.15);
    // centre on the items, then zoom
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    view.x += (cx - r.left - r.width / 2) * view.w / r.width; view.y += (cy - r.top - r.height / 2) * view.h / r.height;
    zoomAt(Math.min(f, 1.5));
  }

  function updateSelPanel() {
    const items = selected(), body = $('selBody');
    if (!items.length) { body.className = 'muted'; body.innerHTML = 'Click an item to select it. Shift-drag on empty space to box-select.'; return; }
    body.className = '';
    const types = {}; items.forEach(i => types[i.type] = (types[i.type] || 0) + 1);
    const desc = Object.keys(types).map(t => `${types[t]} × ${PAC.CATALOG[t].name}`).join(', ');
    const chairs = items.filter(i => i.type === 'chair'), tables = items.filter(i => PAC.CATALOG[i.type].cloth);
    let h = `<div class="sel-desc">${desc}</div>`;
    if (items.length === 1) {
      const it = items[0];
      h += `<div class="grid3"><label>X (mm)<input type="number" step="50" id="pX" value="${Math.round(it.x)}"></label><label>Y (mm)<input type="number" step="50" id="pY" value="${Math.round(it.y)}"></label><label>Rotation°<input type="number" step="15" id="pR" value="${Math.round(it.rot || 0)}"></label></div>`;
      if (it.type === 'label') {
        h += `<label class="full">Text<textarea id="pText" rows="2">${PAC.esc(it.text || '')}</textarea></label>
        <div class="grid2"><label>Size<select id="pSize">${[250, 350, 450, 600, 800, 1000].map(s => `<option value="${s}" ${+(it.size || 450) === s ? 'selected' : ''}>${s / 10} cm</option>`).join('')}</select></label>
        <label>Colour<select id="pColor">${[['#1d3a6b', 'Navy'], ['#b91c1c', 'Red'], ['#15803d', 'Green'], ['#111827', 'Black'], ['#7c3aed', 'Purple']].map(c => `<option value="${c[0]}" ${(it.color || '#1d3a6b') === c[0] ? 'selected' : ''}>${c[1]}</option>`).join('')}</select></label></div>`;
      }
    }
    h += `<div class="btn-row"><button class="btn small" data-rot="-90">⟲ 90°</button><button class="btn small" data-rot="-15">⟲ 15°</button><button class="btn small" data-rot="15">⟳ 15°</button><button class="btn small" data-rot="90">⟳ 90°</button></div>`;
    if (tables.length) { const all = tables.every(t => t.cloth); h += `<label class="check"><input type="checkbox" id="pCloth" ${all ? 'checked' : ''}> Black tablecloth (${tables.length} table${tables.length > 1 ? 's' : ''})</label>`; }
    if (chairs.length) {
      const groups = new Set(chairs.map(c => c.link || '-'));
      h += `<div class="btn-row"><button class="btn small" id="pLink">Link ${chairs.length} chair${chairs.length > 1 ? 's' : ''} (L)</button><button class="btn small" id="pUnlink">Unlink</button></div>
        <div class="small muted">${chairs.filter(c => c.link).length ? `${groups.size} linked group${groups.size > 1 ? 's' : ''} in selection.` : 'Not linked.'} Groups must be 4–16 chairs (NSW I4D20).</div>`;
    }
    h += `<div class="btn-row"><button class="btn small" id="pDup">Duplicate</button><button class="btn small danger" id="pDel">Delete</button></div>`;
    body.innerHTML = h;
    const it0 = items[0];
    const num = (id, fn) => { const el = $(id); if (el) el.onchange = () => { snapshot(); fn(+el.value); changed(); }; };
    num('pX', v => it0.x = v); num('pY', v => it0.y = v); num('pR', v => it0.rot = ((v % 360) + 360) % 360);
    if ($('pText')) { $('pText').onfocus = () => snapshot(); $('pText').oninput = () => { it0.text = $('pText').value; changed(); }; }
    if ($('pSize')) $('pSize').onchange = () => { snapshot(); it0.size = +$('pSize').value; changed(); };
    if ($('pColor')) $('pColor').onchange = () => { snapshot(); it0.color = $('pColor').value; changed(); };
    body.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => rotateSelection(+b.dataset.rot));
    if ($('pCloth')) $('pCloth').onchange = () => setCloth(tables, $('pCloth').checked);
    if ($('pLink')) { $('pLink').onclick = linkSelection; $('pUnlink').onclick = unlinkSelection; }
    $('pDup').onclick = duplicateSelection; $('pDel').onclick = deleteSelection;
  }

  /* ---------------- editing operations ---------------- */
  function addItem(type, x, y, extra) {
    if (remaining(type) <= 0) { toast(`All ${PAC.CATALOG[type].max} × ${PAC.CATALOG[type].name} are already placed.`); return null; }
    let rot = PAC.CATALOG[type].defRot;
    if (type === 'chair') rot = facingFor(x, y);
    const it = Object.assign({ id: PAC.uid(), type, x: snap(x), y: snap(y), rot }, type === 'label' ? { text: 'Label', size: 450, rot: (360 - state.settings.viewRot) % 360 } : {}, extra || {});
    snapshot();
    state.items.push(it);
    sel = new Set([it.id]);
    changed();
    return it;
  }
  function facingFor(x, y) {
    const r = PAC.ROOMS;
    const inR = rr => x >= rr.x && x <= rr.x + rr.w && y >= rr.y && y <= rr.y + rr.h;
    if (inR(r.hall)) return 90;
    if (inR(r.stage)) return 270;
    return 0;
  }
  function setCloth(tables, on) { if (!tables.length) return; snapshot(); tables.forEach(t => t.cloth = on); changed(); }
  function rotateSelection(d) {
    const items = selected(); if (!items.length) return;
    snapshot();
    const cx = items.reduce((s, i) => s + i.x, 0) / items.length, cy = items.reduce((s, i) => s + i.y, 0) / items.length;
    const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    for (const it of items) {
      if (items.length > 1) { const dx = it.x - cx, dy = it.y - cy; it.x = Math.round(cx + dx * c - dy * s); it.y = Math.round(cy + dx * s + dy * c); }
      it.rot = ((((it.rot || 0) + d) % 360) + 360) % 360;
    }
    changed();
  }
  function deleteSelection() { if (!sel.size) return; snapshot(); state.items = state.items.filter(i => !sel.has(i.id)); sel.clear(); changed(); }
  function duplicateSelection() {
    const items = selected(); if (!items.length) return;
    const need = {}; items.forEach(i => need[i.type] = (need[i.type] || 0) + 1);
    for (const t in need) if (need[t] > remaining(t)) return toast(`Not enough ${PAC.CATALOG[t].name.toLowerCase()}s left (${remaining(t)} remaining).`);
    snapshot();
    const linkMap = {};
    const copies = items.map(i => {
      const c = Object.assign({}, i, { id: PAC.uid(), x: i.x + 600, y: i.y + 600 });
      if (i.link) c.link = linkMap[i.link] = linkMap[i.link] || PAC.uid();
      return c;
    });
    state.items.push(...copies); sel = new Set(copies.map(c => c.id)); changed();
  }
  function linkSelection() {
    const chairs = selected().filter(i => i.type === 'chair'); if (!chairs.length) return;
    snapshot(); const id = PAC.uid(); chairs.forEach(c => c.link = id); changed();
    if (chairs.length < PAC.RULES.minGroup || chairs.length > PAC.RULES.maxGroup) toast(`Linked ${chairs.length} chairs — NSW I4D20 needs groups of ${PAC.RULES.minGroup}–${PAC.RULES.maxGroup}.`);
    else toast(`Linked ${chairs.length} chairs.`);
  }
  function unlinkSelection() { const chairs = selected().filter(i => i.type === 'chair'); if (!chairs.length) return; snapshot(); chairs.forEach(c => delete c.link); changed(); }
  function nudge(dx, dy) { const items = selected(); if (!items.length) return; snapshot(); items.forEach(i => { i.x += dx; i.y += dy; }); changed(); }

  /* ---------------- modes ---------------- */
  function setMode(m, type) {
    mode = m; placeType = m === 'place' ? type : null;
    if (m !== 'measure') measure = null;
    wrapEl.classList.toggle('placing', m === 'place');
    wrapEl.classList.toggle('measuring', m === 'measure');
    $('btnMeasure').classList.toggle('on', m === 'measure');
    const hint = $('hint');
    if (m === 'place') { hint.hidden = false; hint.textContent = `Placing ${PAC.CATALOG[type].name} — click on the plan. Esc to stop.`; }
    else if (m === 'measure') { hint.hidden = false; hint.textContent = 'Measure — click two points. Esc to stop.'; }
    else hint.hidden = true;
    if (analysis) { updatePanels(); renderOverlay(); }
  }

  /* ---------------- pointer interaction ---------------- */
  let drag = null, boxSel = null, pan = null;
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 1) return;
    svg.focus({ preventScroll: true });
    const w = toWorld(e.clientX, e.clientY);
    if (e.button === 1) { pan = { x: e.clientX, y: e.clientY, moved: false }; svg.setPointerCapture(e.pointerId); return; }
    if (mode === 'place') { addItem(placeType, w.x, w.y); if (remaining(placeType) <= 0) setMode('select'); return; }
    if (mode === 'measure') {
      if (!measure || measure.b) measure = { a: { x: w.x, y: w.y }, b: null };
      else measure.b = { x: w.x, y: w.y };
      renderOverlay(); return;
    }
    const g = e.target.closest && e.target.closest('.item');
    if (g) {
      const id = g.dataset.id;
      const grp = e.altKey ? [id] : groupIds(id);
      if (e.shiftKey || e.ctrlKey || e.metaKey) { if (sel.has(id)) grp.forEach(g => sel.delete(g)); else grp.forEach(g => sel.add(g)); renderOverlay(); updateSelPanel(); if (!sel.has(id)) return; }
      else if (!sel.has(id)) { sel = new Set(grp); renderOverlay(); updateSelPanel(); }
      const lead = byId(id);
      drag = { start: w, lead, leadOrig: { x: lead.x, y: lead.y }, orig: selected().map(i => ({ i, x: i.x, y: i.y })), moved: false, snapshot: snapKey() };
      svg.setPointerCapture(e.pointerId);
      return;
    }
    if (e.shiftKey) { boxSel = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, add: true, alt: e.altKey }; svg.setPointerCapture(e.pointerId); return; }
    pan = { x: e.clientX, y: e.clientY, moved: false };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if (drag) {
      const w = toWorld(e.clientX, e.clientY);
      let dx = w.x - drag.start.x, dy = w.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < view.w / 400) return;
      drag.moved = true;
      dx = snap(drag.leadOrig.x + dx) - drag.leadOrig.x; dy = snap(drag.leadOrig.y + dy) - drag.leadOrig.y;
      for (const o of drag.orig) { o.i.x = o.x + dx; o.i.y = o.y + dy; }
      renderItemsLayer();
      renderOverlay();
    } else if (pan) {
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) pan.moved = true;
      view.x -= dx * view.w / r.width; view.y -= dy * view.h / r.height;
      pan.x = e.clientX; pan.y = e.clientY;
      applyView();
      if (measure) renderOverlay();
    } else if (boxSel) {
      boxSel.x1 = e.clientX; boxSel.y1 = e.clientY; renderOverlay();
    } else if (mode === 'measure' && measure && !measure.b) {
      measure.cur = toWorld(e.clientX, e.clientY); renderOverlay();
    }
  });
  function endPointer(e) {
    if (drag) {
      if (drag.moved) { undoStack.push(drag.snapshot); redoStack.length = 0; changed(); }
      drag = null;
    } else if (pan) {
      if (!pan.moved && e.type === 'pointerup' && sel.size) { sel.clear(); renderOverlay(); updateSelPanel(); }
      pan = null;
    } else if (boxSel) {
      const x0 = Math.min(boxSel.x0, boxSel.x1), x1 = Math.max(boxSel.x0, boxSel.x1), y0 = Math.min(boxSel.y0, boxSel.y1), y1 = Math.max(boxSel.y0, boxSel.y1);
      for (const it of state.items) { const c = toClient(it.x, it.y); if (c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1) sel.add(it.id); }
      if (!boxSel.alt) sel = expandGroups(sel);
      boxSel = null; renderOverlay(); updateSelPanel();
    }
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.pow(1.0015, e.deltaY), e.clientX, e.clientY); if (measure) renderOverlay(); }, { passive: false });
  svg.addEventListener('dblclick', e => {
    const g = e.target.closest && e.target.closest('.item');
    if (g) { const it = byId(g.dataset.id); if (it && it.type === 'label') { const el = $('pText'); if (el) { el.focus(); el.select(); } } }
  });
  // drag & drop from palette
  svg.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  svg.addEventListener('drop', e => {
    e.preventDefault();
    const d = e.dataTransfer.getData('text/plain');
    if (!d || !d.startsWith('pac:')) return;
    const t = d.slice(4); if (!PAC.CATALOG[t]) return;
    const w = toWorld(e.clientX, e.clientY); addItem(t, w.x, w.y);
  });

  /* ---------------- keyboard ---------------- */
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.querySelector('dialog[open]')) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (ctrl && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); }
    else if (ctrl && (k === 'd' || k === 'D')) { e.preventDefault(); duplicateSelection(); }
    else if (ctrl && (k === 'a' || k === 'A')) { e.preventDefault(); sel = new Set(state.items.map(i => i.id)); renderOverlay(); updateSelPanel(); }
    else if (ctrl && (k === 's' || k === 'S')) { e.preventDefault(); saveLayout(); }
    else if (ctrl) return;
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteSelection(); }
    else if (k === 'Escape') { if (mode !== 'select') setMode('select'); else { sel.clear(); renderOverlay(); updateSelPanel(); } }
    else if (k === 'r' || k === 'R') rotateSelection(e.shiftKey ? -15 : 15);
    else if (k === 'l' || k === 'L') linkSelection();
    else if (k === 'm' || k === 'M') setMode(mode === 'measure' ? 'select' : 'measure');
    else if (k === 'f' || k === 'F') fit();
    else if (k.startsWith('Arrow')) {
      e.preventDefault();
      // arrow keys move in screen directions, so convert through the view rotation
      const step = e.shiftKey ? 500 : 50;
      let sx = 0, sy = 0; if (k === 'ArrowLeft') sx = -1; if (k === 'ArrowRight') sx = 1; if (k === 'ArrowUp') sy = -1; if (k === 'ArrowDown') sy = 1;
      const a = -state.settings.viewRot * Math.PI / 180;
      nudge(Math.round((sx * Math.cos(a) - sy * Math.sin(a)) * step), Math.round((sx * Math.sin(a) + sy * Math.cos(a)) * step));
    }
    else if (k === '+' || k === '=') zoomAt(1 / 1.25);
    else if (k === '-') zoomAt(1.25);
  });

  /* ---------------- chair block dialog ---------------- */
  const dlgBlock = $('dlgBlock');
  function blockParams() {
    const f = dlgBlock.querySelector('form'), v = n => +f.elements[n].value;
    const c = viewCentreWorld();
    const rotSel = f.elements.rot.value;
    return { rows: v('rows'), seats: v('seats'), section: v('section'), aisle: v('aisle'), cc: v('cc'), b2b: v('b2b'),
      rot: rotSel === 'auto' ? facingFor(c.x, c.y) : +rotSel, cx: snap(c.x), cy: snap(c.y) };
  }
  function updateBlockDialog() {
    const o = blockParams(), n = o.rows * o.seats, rem = remaining('chair');
    $('blockSummary').innerHTML = `<b>${n}</b> chairs · ${rem} chairs available. Placed at the centre of the current view, then drag into position.`;
    const w = PAC.checkBlockParams(o);
    if (n > rem) w.unshift(`Only ${rem} chairs are available.`);
    $('blockWarn').innerHTML = w.map(x => `<li class="error">${PAC.esc(x)}</li>`).join('');
    $('blockOk').disabled = n > rem || n < 1;
  }
  function openBlockDialog() { setMode('select'); updateBlockDialog(); dlgBlock.showModal(); }
  dlgBlock.addEventListener('input', updateBlockDialog);
  $('blockCancel').onclick = () => dlgBlock.close();
  dlgBlock.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const o = blockParams();
    dlgBlock.close();
    if (o.rows * o.seats > remaining('chair')) return toast('Not enough chairs.');
    snapshot();
    const chairs = PAC.makeChairBlock(o);
    state.items.push(...chairs);
    sel = new Set(chairs.map(c => c.id));
    changed();
    toast(`Added ${chairs.length} linked chairs — drag to position.`);
  });

  /* ---------------- file / template actions ---------------- */
  function loadData(d, opts) {
    state.meta = Object.assign({ name: '', date: '', start: '', end: '', runBy: '', notes: '' }, d.meta || {});
    state.settings = Object.assign({ retractable: 'in', operableWall: 'in', viewRot: 0 }, d.settings || {});
    state.settings.screens = Object.assign({}, state.settings.screens);
    state.items = (d.items || []).filter(i => i && PAC.CATALOG[i.type]).map(i => Object.assign({}, i));
    sel.clear();
    if (!opts || !opts.keepUndo) { undoStack.length = 0; redoStack.length = 0; }
    syncMetaFields(); updateViewLabel(); baseKey = '';
    changed(); fit();
  }
  function syncMetaFields() {
    $('evName').value = state.meta.name; $('evDate').value = state.meta.date; $('evStart').value = state.meta.start;
    $('evEnd').value = state.meta.end; $('evRunBy').value = state.meta.runBy; $('evNotes').value = state.meta.notes;
    document.title = (state.meta.name ? state.meta.name + ' — ' : '') + 'GPHS PAC Event Layout';
  }
  function buildNewMenu() {
    const m = $('newMenu');
    m.innerHTML = Object.keys(PAC.TEMPLATES).map(k => `<button data-tpl="${k}">${PAC.TEMPLATES[k].name}</button>`).join('');
    m.querySelectorAll('button').forEach(b => b.onclick = () => {
      m.hidden = true;
      if (state.items.length && !confirm('Replace the current layout? (Event details are kept. You can undo.)')) return;
      const t = PAC.TEMPLATES[b.dataset.tpl].build();
      snapshot();
      const used = {};
      state.items = t.items.filter(i => {
        const c = PAC.CATALOG[i.type]; if (!c) return false;
        used[i.type] = (used[i.type] || 0) + 1;
        return c.max == null || used[i.type] <= c.max;
      });
      Object.assign(state.settings, { retractable: t.settings.retractable, operableWall: t.settings.operableWall, screens: Object.assign({}, t.settings.screens) }); sel.clear();
      changed(); fit();
      toast(`Started from “${PAC.TEMPLATES[b.dataset.tpl].name}”.`);
    });
    $('btnNew').onclick = e => { e.stopPropagation(); m.hidden = !m.hidden; };
    document.addEventListener('click', () => { m.hidden = true; });
  }
  function saveLayout() {
    const def = [state.meta.name || 'Untitled layout', state.meta.date].filter(Boolean).join(' — ');
    const name = prompt('Save layout in this browser as:', def);
    if (!name) return;
    if (PAC.store.list().some(s => s.name === name) && !confirm(`Replace the saved layout “${name}”?`)) return;
    if (PAC.store.save(name, serialize())) toast(`Saved “${name}”.`); else toast('Could not save — browser storage is unavailable. Use “Export file” instead.');
  }
  function openSaved() {
    const list = PAC.store.list(), ul = $('savedList');
    ul.innerHTML = list.length ? list.map((s, k) => `<li><div><b>${PAC.esc(s.name)}</b><span class="small muted">${s.savedAt ? new Date(s.savedAt).toLocaleString('en-AU') : ''} · ${(s.data.items || []).length} items</span></div>
      <div><button type="button" class="btn small primary" data-load="${k}">Open</button> <button type="button" class="btn small danger" data-del="${k}">Delete</button></div></li>`).join('')
      : '<li class="muted">No saved layouts yet.</li>';
    ul.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { $('dlgOpen').close(); loadData(list[+b.dataset.load].data); toast(`Opened “${list[+b.dataset.load].name}”.`); });
    ul.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const s = list[+b.dataset.del]; if (confirm(`Delete saved layout “${s.name}”? This cannot be undone.`)) { PAC.store.remove(s.name); openSaved(); } });
    if (!$('dlgOpen').open) $('dlgOpen').showModal();
  }

  /* ---------------- toast ---------------- */
  let toastT = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }

  /* ---------------- wiring ---------------- */
  function bind() {
    const metaMap = { evName: 'name', evDate: 'date', evStart: 'start', evEnd: 'end', evRunBy: 'runBy', evNotes: 'notes' };
    for (const id in metaMap) $(id).addEventListener('input', () => { state.meta[metaMap[id]] = $(id).value; document.title = (state.meta.name ? state.meta.name + ' — ' : '') + 'GPHS PAC Event Layout'; PAC.store.saveCurrent(serialize()); });
    $('btnUndo').onclick = undo; $('btnRedo').onclick = redo;
    $('btnRotL').onclick = () => rotateView(-90); $('btnRotR').onclick = () => rotateView(90);
    $('btnFit').onclick = fit;
    $('zoomIn').onclick = () => zoomAt(1 / 1.3); $('zoomOut').onclick = () => zoomAt(1.3);
    $('btnMeasure').onclick = () => setMode(mode === 'measure' ? 'select' : 'measure');
    document.querySelectorAll('[data-ret]').forEach(b => b.onclick = () => { if (state.settings.retractable === b.dataset.ret) return; snapshot(); state.settings.retractable = b.dataset.ret; changed(); });
    document.querySelectorAll('[data-wall]').forEach(b => b.onclick = () => { if (state.settings.operableWall === b.dataset.wall) return; snapshot(); state.settings.operableWall = b.dataset.wall; changed(); });
    $('btnSave').onclick = saveLayout;
    $('btnOpen').onclick = openSaved;
    $('btnExportJson').onclick = () => PAC.exportJson(serialize());
    $('btnImportJson').onclick = () => $('fileImport').click();
    $('fileImport').onchange = async () => {
      const f = $('fileImport').files[0]; if (!f) return;
      try { const d = PAC.parseLayoutFile(await f.text()); snapshot(); loadData(d, { keepUndo: true }); toast(`Imported “${d.meta && d.meta.name || f.name}”.`); }
      catch (err) { toast('Could not open file: ' + err.message); }
      $('fileImport').value = '';
    };
    $('btnPdf').onclick = async () => {
      if (!PAC.pdfAvailable()) { toast('PDF library not loaded (offline?) — opening Print instead; choose “Save as PDF”.'); return PAC.printLayout(state, analysis, $('paper').value); }
      const b = $('btnPdf'); b.disabled = true; b.textContent = 'Building PDF…';
      try { await PAC.exportPdf(state, analysis, $('paper').value); toast('PDF downloaded.'); }
      catch (err) { console.error(err); toast('PDF export failed — opening Print instead.'); PAC.printLayout(state, analysis, $('paper').value); }
      finally { b.disabled = false; b.textContent = 'Export PDF'; }
    };
    $('btnPng').onclick = () => PAC.exportPng(state, analysis, $('paper').value).then(() => toast('PNG downloaded.'), err => toast(err.message));
    $('btnPrint').onclick = () => PAC.printLayout(state, analysis, $('paper').value);
    $('btnHelp').onclick = () => $('dlgHelp').showModal();
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(svg);
  }

  /* ---------------- start ---------------- */
  buildPalette(); buildNewMenu(); bind();
  const saved = PAC.store.loadCurrent();
  let startData = null;
  try { if (saved && saved.app === 'gphs-pac-layout') startData = saved; } catch (e) { startData = null; }
  loadData(startData || Object.assign({ meta: {} }, PAC.TEMPLATES.empty.build()));
  // expose for debugging
  window.PAC_APP = {
    state, get analysis() { return analysis; }, fit, render, changed, toast, updateSelPanel,
    refreshBase() { baseKey = ''; render(); },
    clearSelection() { sel.clear(); renderOverlay(); },
    snapValue: snapVal,
    viewRot: () => state.settings.viewRot,
    worldPerPx: () => view.w / clientSize().w,
    viewCentre: viewCentreWorld,
    zoomToRect(r) {
      const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(p => toClient(p[0], p[1]));
      const b = svg.getBoundingClientRect();
      const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
      view.x += ((x0 + x1) / 2 - b.left - b.width / 2) * view.w / b.width; view.y += ((y0 + y1) / 2 - b.top - b.height / 2) * view.h / b.height;
      zoomAt(Math.max((x1 - x0) / b.width, (y1 - y0) / b.height) * 1.6);
    },
  };
})();
