/*
 * Seating compliance checks — NCC 2022 Volume One, NSW Part I4 (Entertainment venues).
 * Values transcribed from the ABCB NCC 2022 NSW Part I4 text. If the NCC edition adopted
 * at the time of the event differs, update RULES below.
 *
 *  NSW I4D17  I4D18–I4D25 do not apply to continental seating or seating at tables.
 *  NSW I4D18  Rows: max 8 seats with an aisle at one end only; max 16 with aisles at both ends.
 *  NSW I4D19  Chairs: >= 450 mm c/c (no arms) / 500 mm (arms); >= 300 mm clear between the front
 *             of a chair and the back of the chair in front; >= 950 mm back-to-back.
 *  NSW I4D20  Level floor: chairs fastened to the floor OR secured together in groups of 4–16.
 *  NSW I4D23  Aisles >= 1000 mm wide; cross-overs >= 1500 mm wide.
 *
 * This is a planning aid only — it does not certify a layout.
 */
window.PAC = window.PAC || {};

PAC.RULES = {
  chairsHaveArms: false,
  minCentres: 450,          // I4D19(a)/(b) — 500 if chairs have arms
  minCentresArms: 500,
  minClearFront: 300,       // I4D19(c)
  minBackToBack: 950,       // I4D19(d)
  maxSeatsOneAisle: 8,      // I4D18(a)
  maxSeatsTwoAisles: 16,    // I4D18(b)
  minGroup: 4,              // I4D20(b)
  maxGroup: 16,             // I4D20(b)
  minAisle: 1000,           // I4D23(a)
  minCrossOver: 1500,       // I4D23(a) — used as the clear zone in front of egress doors
  tableSeatingDist: 450,    // chair within this distance of a table = seating at tables (I4D17)
};

/* ---------- geometry helpers ---------- */
function rectCorners(r) { return [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]]; }
function inRect(p, r, tol) { tol = tol || 1; return p[0] >= r.x - tol && p[0] <= r.x + r.w + tol && p[1] >= r.y - tol && p[1] <= r.y + r.h + tol; }
function polyAxes(P) { const a = []; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a.push([-(q[1] - p[1]), q[0] - p[0]]); } return a; }
function project(P, ax) { let mn = Infinity, mx = -Infinity; for (const p of P) { const d = p[0] * ax[0] + p[1] * ax[1]; if (d < mn) mn = d; if (d > mx) mx = d; } return [mn, mx]; }
/* Separating axis test for convex quads; returns overlap depth along the weakest axis (0 = no overlap). */
function overlap(A, B) {
  let min = Infinity;
  for (const ax of polyAxes(A).concat(polyAxes(B))) {
    const len = Math.hypot(ax[0], ax[1]); if (!len) continue;
    const n = [ax[0] / len, ax[1] / len];
    const a = project(A, n), b = project(B, n);
    const o = Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
    if (o <= 0) return 0;
    if (o < min) min = o;
  }
  return min;
}
function bbox(P) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return { x0, y0, x1, y1 }; }
function bbOverlap(a, b) { return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1; }
function pointSegDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function pointPolyDist(p, P) {
  // inside test (convex)
  let sign = 0, inside = true;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (cr !== 0) { const s = Math.sign(cr); if (!sign) sign = s; else if (s !== sign) { inside = false; break; } }
  }
  if (inside) return 0;
  let d = Infinity; for (let i = 0; i < P.length; i++) d = Math.min(d, pointSegDist(p, P[i], P[(i + 1) % P.length]));
  return d;
}
PAC.geom = { rectCorners, inRect, overlap, bbox, bbOverlap };

/* Which usable room fully contains the item (null if none). */
PAC.roomOf = function (corners, settings) {
  for (const r of PAC.usableRooms(settings)) if (corners.every(p => inRect(p, r))) return r;
  return null;
};

PAC.retractableRect = function (settings) {
  return settings.retractable === 'out' ? PAC.RETRACTABLE.out : PAC.RETRACTABLE.stowed;
};

/* ---------- main check ---------- */
PAC.checkLayout = function (state) {
  const R = PAC.RULES, S = state.settings, items = state.items;
  const issues = [];
  const add = (level, rule, msg, ids) => issues.push({ level, rule, msg, ids: ids || [] });

  const geo = new Map();
  for (const it of items) { const c = PAC.itemCorners(it); geo.set(it.id, { c, bb: bbox(c) }); }

  /* Inventory */
  const counts = PAC.countItems(items);
  for (const t in PAC.CATALOG) {
    const max = PAC.CATALOG[t].max;
    if (max != null && (counts[t] || 0) > max) add('error', 'Inventory', `${counts[t]} × ${PAC.CATALOG[t].name} placed but only ${max} available.`, items.filter(i => i.type === t).map(i => i.id));
  }

  /* Placement: inside a usable room, not on retractable seating, not overlapping */
  const ret = PAC.retractableRect(S), retC = rectCorners(ret);
  const solid = items.filter(i => !PAC.CATALOG[i.type].free);
  for (const it of solid) {
    const g = geo.get(it.id);
    if (!PAC.roomOf(g.c, S)) add('error', 'Placement', `${PAC.CATALOG[it.type].name} is not fully inside the Auditorium, Stage or a Learning Centre${S.operableWall === 'in' ? ' (or straddles the operable wall)' : ''}.`, [it.id]);
    if (overlap(g.c, retC) > 1) add('error', 'Placement', `${PAC.CATALOG[it.type].name} overlaps the retractable seating (${S.retractable === 'out' ? 'extended' : 'stowed'}).`, [it.id]);
  }
  const overlapPairs = [];
  for (let i = 0; i < solid.length; i++) {
    const a = solid[i], ga = geo.get(a.id);
    for (let j = i + 1; j < solid.length; j++) {
      const b = solid[j], gb = geo.get(b.id);
      if (!bbOverlap(ga.bb, gb.bb)) continue;
      // lectern may sit on rostra
      const da = PAC.CATALOG[a.type].draw, db = PAC.CATALOG[b.type].draw;
      if ((da === 'rostra') !== (db === 'rostra') && (da === 'lectern' || db === 'lectern')) continue;
      if (overlap(ga.c, gb.c) > 5) overlapPairs.push([a.id, b.id]);
    }
  }
  if (overlapPairs.length) {
    const ids = [...new Set(overlapPairs.flat())];
    add('warn', 'Placement', `${overlapPairs.length} pair${overlapPairs.length > 1 ? 's' : ''} of items overlap.`, ids);
  }

  /* Egress door clear zones */
  for (const d of PAC.DOORS) {
    if (!d.egress) continue;
    const dg = PAC.doorGeom(d, R.minCrossOver); if (!dg) continue;
    const z = dg.zone, zc = rectCorners(z);
    const zbb = bbox(zc);
    const blocking = solid.filter(it => bbOverlap(geo.get(it.id).bb, zbb) && overlap(geo.get(it.id).c, zc) > 1);
    if (S.retractable === 'out' && overlap(zc, retC) > 1) add('warn', 'Egress', `Retractable seating extends into the clear zone at ${d.name}.`, []);
    if (blocking.length) add('error', 'I4D23 / egress', `Keep ${R.minCrossOver} mm clear inside ${d.name} doorway (cross-over width).`, blocking.map(i => i.id));
  }

  /* Seating rows (loose chairs) */
  const tables = items.filter(i => PAC.CATALOG[i.type].draw === 'table');
  const chairs = items.filter(i => i.type === 'chair');
  const atTable = new Set();
  for (const ch of chairs) {
    for (const t of tables) {
      if (Math.hypot(t.x - ch.x, t.y - ch.y) > 2000) continue;
      if (pointPolyDist([ch.x, ch.y], geo.get(t.id).c) <= R.tableSeatingDist + 250) { atTable.add(ch.id); break; }
    }
  }
  const rowChairs = chairs.filter(c => !atTable.has(c.id));
  const rows = PAC.findRows(rowChairs);
  const obstacles = items.filter(i => !PAC.CATALOG[i.type].free);
  const minCC = R.chairsHaveArms ? R.minCentresArms : R.minCentres;
  const cs = PAC.CATALOG.chair;

  for (const row of rows) {
    // I4D19(a)/(b) centres
    const tight = [];
    for (let k = 1; k < row.chairs.length; k++) if (row.pu[k] - row.pu[k - 1] < minCC - 2) tight.push(row.chairs[k - 1].id, row.chairs[k].id);
    if (tight.length) add('error', 'I4D19', `Chairs closer than ${minCC} mm centre to centre.`, [...new Set(tight)]);

    // aisle at each end?
    const ends = [-1, 1].map(dir => PAC.rowEndOpen(row, dir, obstacles, geo, S));
    row.ends = ends;
    const open = ends.filter(Boolean).length;
    const n = row.chairs.length, ids = row.chairs.map(c => c.id);
    if (open === 0) add('error', 'I4D18', `Row of ${n} has no ${R.minAisle} mm aisle at either end.`, ids);
    else if (open === 1 && n > R.maxSeatsOneAisle) add('error', 'I4D18', `Row of ${n} seats with an aisle at one end only (max ${R.maxSeatsOneAisle}).`, ids);
    else if (n > R.maxSeatsTwoAisles) add('error', 'I4D18', `Row of ${n} seats exceeds ${R.maxSeatsTwoAisles} (aisles both ends).`, ids);
  }

  // I4D19(c)/(d) row spacing — compare each row with the nearest row behind it
  for (const row of rows) {
    let best = null;
    for (const o of rows) {
      if (o === row || o.rotKey !== row.rotKey) continue;
      const d = row.pv - o.pv; // positive = o is behind row
      if (d <= 50) continue;
      const ov = Math.min(row.u1, o.u1) - Math.max(row.u0, o.u0);
      if (ov < 100) continue;
      if (!best || d < best.d) best = { d, o };
    }
    if (best) {
      const clear = best.d - cs.h;
      if (best.d < R.minBackToBack - 2) add('error', 'I4D19', `Rows ${Math.round(best.d)} mm back-to-back (min ${R.minBackToBack}).`, row.chairs.concat(best.o.chairs).map(c => c.id));
      else if (clear < R.minClearFront - 2) add('error', 'I4D19', `Only ${Math.round(clear)} mm clear between rows (min ${R.minClearFront}).`, row.chairs.concat(best.o.chairs).map(c => c.id));
    }
  }

  // I4D20 linking (all PAC floors are level)
  const unlinked = rowChairs.filter(c => !c.link);
  if (unlinked.length) add('error', 'I4D20', `${unlinked.length} chair${unlinked.length > 1 ? 's are' : ' is'} not linked. Link chairs in groups of ${R.minGroup}–${R.maxGroup} (select, then Link).`, unlinked.map(c => c.id));
  const groups = {};
  for (const c of chairs) if (c.link) (groups[c.link] = groups[c.link] || []).push(c);
  for (const g in groups) {
    const list = groups[g];
    if (list.every(c => atTable.has(c.id))) continue;
    if (list.length < R.minGroup || list.length > R.maxGroup) add('error', 'I4D20', `Linked group of ${list.length} chairs (must be ${R.minGroup}–${R.maxGroup}).`, list.map(c => c.id));
  }

  return { issues, rows, atTable, counts };
};

/* Group chairs into rows: same rotation, same row line, consecutive seats. */
PAC.findRows = function (chairs) {
  const byRot = {};
  for (const c of chairs) { const k = ((Math.round(c.rot || 0) % 360) + 360) % 360; (byRot[k] = byRot[k] || []).push(c); }
  const rows = [];
  const gapLimit = PAC.CATALOG.chair.w + 250;
  for (const k in byRot) {
    const a = k * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], f = [Math.sin(a), -Math.cos(a)];
    const list = byRot[k].map(c => ({ c, pu: c.x * u[0] + c.y * u[1], pv: c.x * f[0] + c.y * f[1] })).sort((p, q) => p.pv - q.pv);
    const lines = [];
    for (const p of list) {
      const L = lines[lines.length - 1];
      if (L && Math.abs(p.pv - L.pv) <= 120) { L.items.push(p); L.pv = L.items.reduce((s, q) => s + q.pv, 0) / L.items.length; }
      else lines.push({ pv: p.pv, items: [p] });
    }
    for (const L of lines) {
      L.items.sort((p, q) => p.pu - q.pu);
      let cur = null;
      for (const p of L.items) {
        if (!cur || p.pu - cur.pu[cur.pu.length - 1] > gapLimit) {
          cur = { rotKey: +k, u, f, pv: L.pv, chairs: [], pu: [] };
          rows.push(cur);
        }
        cur.chairs.push(p.c); cur.pu.push(p.pu);
      }
    }
  }
  for (const r of rows) { r.u0 = r.pu[0] - PAC.CATALOG.chair.w / 2; r.u1 = r.pu[r.pu.length - 1] + PAC.CATALOG.chair.w / 2; }
  return rows;
};

/* Is there a clear aisle (>= RULES.minAisle wide) beyond the given end of the row? */
PAC.rowEndOpen = function (row, dir, obstacles, geo, settings) {
  const A = PAC.RULES.minAisle, cw = PAC.CATALOG.chair.w, ch = PAC.CATALOG.chair.h;
  const endU = dir < 0 ? row.pu[0] - cw / 2 : row.pu[row.pu.length - 1] + cw / 2;
  const cu = endU + dir * (A / 2 + 5);
  const cx = cu * row.u[0] + row.pv * row.f[0], cy = cu * row.u[1] + row.pv * row.f[1];
  const hw = A / 2 - 10, hh = ch / 2 - 10;
  const a = row.rotKey * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const P = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(p => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]);
  if (!PAC.roomOf(P, settings)) return false;
  if (overlap(P, rectCorners(PAC.retractableRect(settings))) > 1) return false;
  const bb = bbox(P);
  for (const o of obstacles) {
    const g = geo.get(o.id);
    if (bbOverlap(bb, g.bb) && overlap(P, g.c) > 1) return false;
  }
  return true;
};

PAC.countItems = function (items) {
  const n = {};
  for (const it of items) n[it.type] = (n[it.type] || 0) + 1;
  for (const t in PAC.CATALOG) if (PAC.CATALOG[t].cloth) n['cloth:' + t] = items.filter(i => i.type === t && i.cloth).length;
  return n;
};
