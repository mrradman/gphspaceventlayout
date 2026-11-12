/*
 * Floor plan model. Building data lives in js/building.js (PAC.BUILDING_DEFAULT) and can be
 * overridden in this browser by the building editor (saved to localStorage).
 * PAC.applyBuilding(data) rebuilds the PAC.* geometry globals used by the rest of the app.
 */
window.PAC = window.PAC || {};

PAC.ROOM_STYLE = {
  hall:  { floor: '#efe5d2' },
  stage: { floor: '#dcc7a1' },
  lc1:   { floor: '#e1e7ef' },
  lc2:   { floor: '#e1e7ef' },
  lcAll: { floor: '#e1e7ef' },
};
PAC.USABLE_IDS = ['hall', 'stage', 'lc1', 'lc2'];
PAC.BUILDING_KEY = 'gphsPac.building';

PAC.clone = o => JSON.parse(JSON.stringify(o));

PAC.applyBuilding = function (data) {
  PAC.BUILDING = data;
  PAC.GRID = data.grid;
  const rooms = {};
  for (const id of PAC.USABLE_IDS) rooms[id] = Object.assign({ id }, data.rooms[id], PAC.ROOM_STYLE[id]);
  const a = rooms.lc1, b = rooms.lc2;
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), x1 = Math.max(a.x + a.w, b.x + b.w), y1 = Math.max(a.y + a.h, b.y + b.h);
  rooms.lcAll = Object.assign({ id: 'lcAll', code: `${a.code} + ${b.code}`, name: 'Learning Centres 1 & 2', sub: 'combined — operable wall out',
    area: Math.round(((a.area || 0) + (b.area || 0) + data.operableWall.w * data.operableWall.h / 1e6) * 10) / 10, x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, PAC.ROOM_STYLE.lcAll);
  PAC.ROOMS = rooms;
  PAC.OPERABLE_WALL = Object.assign({}, data.operableWall, { stack: data.operableStack });
  PAC.PROSCENIUM = data.proscenium;
  PAC.RETRACTABLE = PAC.normaliseRetractable(data.retractable);
  PAC.CONTEXT_ROOMS = data.contextRooms;
  PAC.OUTDOOR = data.outdoor;
  PAC.DOORS = PAC.normaliseDoors(data.doors);
  if (!Array.isArray(data.screens)) data.screens = [];
  PAC.SCREENS = data.screens;
  (data.proscenium || []).forEach((w, i) => { if (!w.name) w.name = i < 2 ? 'Proscenium wall' : 'Wall'; });
  const gx = Object.values(data.grid.x), gy = Object.values(data.grid.y);
  const minX = Math.min(...gx), maxX = Math.max(...gx), minY = Math.min(...gy), maxY = Math.max(...gy);
  PAC.EXTENTS = { x: minX - 2100, y: minY - 3200, w: maxX - minX + 2900, h: maxY - minY + 6900 };
  PAC.CENTER = { x: PAC.EXTENTS.x + PAC.EXTENTS.w / 2, y: PAC.EXTENTS.y + PAC.EXTENTS.h / 2 };
};

/*
 * Retractable seating rows, front row (nearest the stage) first:
 *   { label: 'A', blocks: [6, -2, 9, -2, 6] }  — positive = seats, negative = aisle (in seat widths).
 * Older data used plain seat counts per row; those become one block each. `seats` is always recalculated.
 */
PAC.ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // theatre style: no I or O
PAC.normaliseRetractable = function (rt) {
  rt.rows = (rt.rows || []).map((r, i) => {
    const label = (r && r.label) || PAC.ROW_LETTERS[i] || String(i + 1);
    const blocks = typeof r === 'number' ? [r] : ((r && r.blocks) || []).map(Number).filter(n => n && isFinite(n)).map(Math.round);
    return { label, blocks };
  });
  rt.seats = rt.rows.reduce((s, r) => s + r.blocks.filter(b => b > 0).reduce((a, b) => a + b, 0), 0);
  return rt;
};
/* "A: 6 (2) 9 (2) 6" lines <-> rows. Aisles may be written (2) or -2. */
PAC.rowsToText = rows => rows.map(r => `${r.label}: ${r.blocks.map(b => b < 0 ? `(${-b})` : b).join(' ')}`).join('\n');
PAC.textToRows = function (text) {
  const rows = [];
  String(text).split(/\r?\n/).forEach(line => {
    line = line.trim(); if (!line) return;
    const m = /^([A-Za-z0-9]{1,3})\s*[:.)-]\s*(.*)$/.exec(line);
    const label = m ? m[1].toUpperCase() : (PAC.ROW_LETTERS[rows.length] || String(rows.length + 1));
    const body = m ? m[2] : line;
    const blocks = [];
    for (const tok of body.match(/\(\s*\d+\s*\)|-?\d+/g) || []) {
      const n = parseInt(tok.replace(/[()\s]/g, ''), 10);
      if (!n) continue;
      blocks.push(tok.startsWith('(') ? -Math.abs(n) : n);
    }
    if (blocks.some(b => b > 0)) rows.push({ label, blocks });
  });
  return rows;
};

/* Screens are up unless the layout says they're down. */
PAC.screenDown = (settings, sc) => !!(settings && settings.screens && settings.screens[sc.id] === 'down');

PAC.usableRooms = function (settings) {
  const r = PAC.ROOMS;
  return settings.operableWall === 'out' ? [r.hall, r.stage, r.lcAll] : [r.hall, r.stage, r.lc1, r.lc2];
};

/*
 * Doors are hosted in a wall:
 *   host 'room:<id>'  a wall of a usable room   (side = which wall: n/s/e/w; inside = the room)
 *   host 'ctx:<i>'    a wall of an "other" room (side = which wall; inside = that room)
 *   host 'wall:<i>'   an added wall segment     (side = the face the door opens towards / "outside")
 * In every case `side` is the OUTWARD direction of the door; the clear zone is on the other face.
 */
PAC.hostRect = function (host) {
  const [kind, id] = String(host || '').split(':');
  if (kind === 'room') return PAC.ROOMS[id] ? { kind, r: PAC.ROOMS[id] } : null;
  if (kind === 'ctx') return PAC.CONTEXT_ROOMS[+id] ? { kind, r: PAC.CONTEXT_ROOMS[+id] } : null;
  if (kind === 'wall') return PAC.PROSCENIUM[+id] ? { kind, r: PAC.PROSCENIUM[+id] } : null;
  return null;
};

/* Wall line the door sits on: axis (horiz), centre line (fixed), extent (a0..a1), thickness, inner face, inward sign. */
PAC.hostWall = function (host, side) {
  const h = PAC.hostRect(host); if (!h) return null;
  const r = h.r;
  if (h.kind === 'wall') {
    const horiz = r.w >= r.h;
    let s = side;
    if (horiz && s !== 'n' && s !== 's') s = 'n';
    if (!horiz && s !== 'e' && s !== 'w') s = 'e';
    if (horiz) return { horiz, side: s, fixed: r.y + r.h / 2, a0: r.x, a1: r.x + r.w, thick: Math.max(100, r.h), inner: s === 'n' ? r.y + r.h : r.y, inSign: s === 'n' ? 1 : -1 };
    return { horiz, side: s, fixed: r.x + r.w / 2, a0: r.y, a1: r.y + r.h, thick: Math.max(100, r.w), inner: s === 'w' ? r.x + r.w : r.x, inSign: s === 'w' ? 1 : -1 };
  }
  const t = 200;
  if (side === 'n') return { horiz: true, side, fixed: r.y, a0: r.x, a1: r.x + r.w, thick: t, inner: r.y, inSign: 1 };
  if (side === 's') return { horiz: true, side, fixed: r.y + r.h, a0: r.x, a1: r.x + r.w, thick: t, inner: r.y + r.h, inSign: -1 };
  if (side === 'w') return { horiz: false, side, fixed: r.x, a0: r.y, a1: r.y + r.h, thick: t, inner: r.x, inSign: 1 };
  return { horiz: false, side: 'e', fixed: r.x + r.w, a0: r.y, a1: r.y + r.h, thick: t, inner: r.x + r.w, inSign: -1 };
};

/* Direction (sign along the wall axis, in world coords) of the door's local +x. Local frame: out = -y. */
PAC.doorAxisSign = side => (side === 's' || side === 'w') ? -1 : 1;

/* Extra wall length a sliding door's cavity needs beyond the opening, on each end [low, high] (world order). */
PAC.doorPockets = function (d, side) {
  if (d.type !== 'sliding') return [0, 0];
  if ((d.leaves || 1) === 2) return [d.w / 2, d.w / 2];
  // single leaf: pocket on the 'left' (local -x) unless hinge/pocket = right
  const leftIsLow = PAC.doorAxisSign(side || d.side) > 0;
  const pocketLow = (d.hinge === 'right') ? !leftIsLow : leftIsLow;
  return pocketLow ? [d.w, 0] : [0, d.w];
};

/* World geometry of a door: opening (gap), clear zone on the inside face, and its host wall. */
PAC.doorGeom = function (d, clearDepth) {
  const hw = PAC.hostWall(d.host, d.side); if (!hw) return null;
  const t = Math.max(200, hw.thick), c = clearDepth || 0;
  let gap, zone;
  if (hw.horiz) {
    gap = { x: d.at - d.w / 2, y: hw.fixed - t / 2, w: d.w, h: t };
    zone = { x: d.at - d.w / 2, y: hw.inSign > 0 ? hw.inner : hw.inner - c, w: d.w, h: c };
  } else {
    gap = { x: hw.fixed - t / 2, y: d.at - d.w / 2, w: t, h: d.w };
    zone = { x: hw.inSign > 0 ? hw.inner : hw.inner - c, y: d.at - d.w / 2, w: c, h: d.w };
  }
  return { gap, zone, hw };
};

/* Floor colour behind a door opening (so the wall gap reads as open). */
PAC.doorFloor = function (d, settings) {
  const g = PAC.doorGeom(d, 300); if (!g) return '#fbfbfc';
  const p = { x: g.zone.x + g.zone.w / 2, y: g.zone.y + g.zone.h / 2 };
  for (const r of PAC.usableRooms(settings)) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return r.floor;
  for (const r of PAC.CONTEXT_ROOMS) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return '#eceef1';
  return '#fbfbfc';
};

/* Older data used { room, side }; convert to { host, side } and fill defaults. */
PAC.normaliseDoors = function (doors) {
  for (const d of doors) {
    if (!d.host) d.host = 'room:' + (d.room || 'hall');
    delete d.room;
    if (!d.type) d.type = 'swing';
    if (!d.leaves) d.leaves = 2;
    if (!d.swing) d.swing = 'out';
    if (!d.hinge) d.hinge = 'left';
  }
  return doors;
};

/* The building always comes from js/building.js (edited with editor.html, which saves into that file). */
PAC.BUILDING_FILE = PAC.clone(PAC.BUILDING_DEFAULT);
PAC.applyBuilding(PAC.clone(PAC.BUILDING_FILE));
