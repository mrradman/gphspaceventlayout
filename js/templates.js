/* Chair-block generator and starter layouts. */
window.PAC = window.PAC || {};

PAC.uid = function () { return Math.random().toString(36).slice(2, 9); };

/*
 * Generate a block of linked chairs.
 * o: { rows, seats, section (seats between aisles, 0 = none), aisle (mm clear), cc (mm c/c), b2b (mm back-to-back),
 *      rot (deg, direction the chairs face), cx, cy (block centre) }
 * Each run of seats between aisles is linked in groups of at most RULES.maxGroup.
 */
PAC.makeChairBlock = function (o) {
  const cw = PAC.CATALOG.chair.w;
  const a = o.rot * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], f = [Math.sin(a), -Math.cos(a)];
  const sec = o.section > 0 ? o.section : o.seats;
  const extra = cw + o.aisle - o.cc; // extra spacing where an aisle falls
  const uOf = i => i * o.cc + Math.floor(i / sec) * extra;
  const uMid = uOf(o.seats - 1) / 2, vMid = -(o.rows - 1) * o.b2b / 2;
  const out = [];
  for (let r = 0; r < o.rows; r++) {
    const v = -r * o.b2b - vMid;
    for (let s0 = 0; s0 < o.seats; s0 += sec) {
      const n = Math.min(sec, o.seats - s0);
      const nGroups = Math.ceil(n / PAC.RULES.maxGroup);
      const base = Math.floor(n / nGroups), rem = n % nGroups;
      let i = s0;
      for (let g = 0; g < nGroups; g++) {
        const size = base + (g < rem ? 1 : 0), link = PAC.uid();
        for (let k = 0; k < size; k++, i++) {
          const uu = uOf(i) - uMid;
          out.push({ id: PAC.uid(), type: 'chair', rot: o.rot, link,
            x: Math.round(o.cx + uu * u[0] + v * f[0]), y: Math.round(o.cy + uu * u[1] + v * f[1]) });
        }
      }
    }
  }
  return out;
};

/* Validate chair-block parameters against the rules; returns a list of warnings. */
PAC.checkBlockParams = function (o) {
  const R = PAC.RULES, w = [];
  const minCC = R.chairsHaveArms ? R.minCentresArms : R.minCentres;
  const sec = o.section > 0 ? o.section : o.seats;
  if (o.cc < minCC) w.push(`Seat spacing ${o.cc} mm is below ${minCC} mm c/c (NSW I4D19).`);
  if (o.b2b < R.minBackToBack) w.push(`Row spacing ${o.b2b} mm is below ${R.minBackToBack} mm back-to-back (NSW I4D19).`);
  if (o.b2b - PAC.CATALOG.chair.h < R.minClearFront) w.push(`Clear space between rows is below ${R.minClearFront} mm (NSW I4D19).`);
  if (sec > R.maxSeatsTwoAisles) w.push(`${sec} seats between aisles exceeds ${R.maxSeatsTwoAisles} (NSW I4D18). Add aisles.`);
  if (o.section > 0 && o.section < o.seats && o.aisle < R.minAisle) w.push(`Aisle width ${o.aisle} mm is below ${R.minAisle} mm (NSW I4D23).`);
  if (sec < R.minGroup) w.push(`Sections of ${sec} chairs can't be linked in groups of ${R.minGroup}+ (NSW I4D20).`);
  return w;
};

function item(type, x, y, rot, extra) { const c = PAC.CATALOG[type]; return Object.assign({ id: PAC.uid(), type, x, y, rot: rot == null ? (c ? c.defRot : 0) : rot }, extra || {}); }

PAC.TEMPLATES = {
  empty: {
    name: 'Empty',
    build: () => ({ settings: { retractable: 'in', operableWall: 'in' }, items: [] }),
  },
  assembly: {
    name: 'Assembly / presentation',
    build: () => {
      const items = PAC.makeChairBlock({ rows: 10, seats: 20, section: 10, aisle: 1100, cc: 500, b2b: 1000, rot: 90, cx: 30800, cy: 10700 });
      items.push(item('lectern', 39300, 6200, 270), item('micHandheld', 39300, 7200, 0), item('micHandheld', 39800, 7200, 0));
      return { settings: { retractable: 'out', operableWall: 'in', screens: { stage: 'down' } }, items };
    },
  },
  concert: {
    name: 'Concert (rostra on stage)',
    build: () => {
      const items = PAC.makeChairBlock({ rows: 8, seats: 22, section: 11, aisle: 1100, cc: 500, b2b: 1000, rot: 90, cx: 30500, cy: 10700 });
      // place rostra and mics relative to the Stage outline (it can be edited in editor.html)
      const st = PAC.ROOMS.stage, my = st.y + st.h / 2, back = st.x + st.w - 1100, front = st.x + 800;
      // centre first, so if fewer rostra are in stock the ones kept are in the middle
      [[1800, 0], [0, -1200], [0, 1200], [1800, -2400], [1800, 2400], [0, -3600], [0, 3600]]
        .forEach(([dx, d]) => items.push(item('rostra', back - dx, my + d, 90)));
      [-3700, -1500, 1500, 3700].forEach(d => items.push(item('micHandheld', front, my + d, 0)));
      items.push(item('micHeadset', front + 1000, my - 900, 0), item('micHeadset', front + 1000, my + 900, 0));
      return { settings: { retractable: 'out', operableWall: 'in' }, items };
    },
  },
  exam: {
    name: 'Exam (110 desks)',
    build: () => {
      const items = [];
      for (let c = 0; c < 11; c++) for (let r = 0; r < 10; r++) {
        const x = 20000 + c * 1500, y = 5000 + r * 1250;
        items.push(item('table600', x, y, 0), item('chair', x - 600, y, 90));
      }
      items.push(item('label', 37300, 10700, 90, { text: 'SUPERVISOR', size: 400 }));
      return { settings: { retractable: 'in', operableWall: 'in' }, items };
    },
  },
  dinner: {
    name: 'Dinner / gala (20 tables)',
    build: () => {
      const items = [];
      for (let c = 0; c < 4; c++) for (let r = 0; r < 5; r++) {
        const x = 21500 + c * 4000, y = 4800 + r * 2900;
        items.push(item('table1500', x, y, 0, { cloth: true }));
        [-500, 0, 500].forEach(dx => { items.push(item('chair', x + dx, y - 760, 180), item('chair', x + dx, y + 760, 0)); });
      }
      items.push(item('lectern', 39300, 6200, 270), item('micHandheld', 39300, 7200, 0));
      return { settings: { retractable: 'in', operableWall: 'in' }, items };
    },
  },
};
