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

/*
 * Layout templates live in js/layouts.js (PAC.TEMPLATES_DEFAULT), managed on the editor's Templates tab.
 * "Empty" is built in and always offered first.
 */
PAC.templateList = () => ((PAC.TEMPLATES_DEFAULT && PAC.TEMPLATES_DEFAULT.templates) || []).filter(t => t && t.id);
PAC.findTemplate = id => PAC.templateList().find(t => t.id === id) || null;

/* A template's contents ready to place: fresh ids, linked groups kept together, unknown items dropped, capped to stock. */
PAC.instantiateTemplate = function (t) {
  const used = {}, links = {}, items = [];
  for (const i of (t && t.items) || []) {
    const c = PAC.CATALOG[i.type]; if (!c) continue;
    used[i.type] = (used[i.type] || 0) + 1;
    if (c.max != null && used[i.type] > c.max) continue;
    const it = Object.assign({}, i, { id: PAC.uid() });
    if (i.link) it.link = links[i.link] = links[i.link] || PAC.uid();
    items.push(it);
  }
  const st = (t && t.settings) || {};
  return { settings: { retractable: st.retractable === 'out' ? 'out' : 'in', operableWall: st.operableWall === 'out' ? 'out' : 'in', screens: Object.assign({}, st.screens) }, items };
};

/* Text of js/layouts.js (one item per line keeps the file readable and diff-friendly). */
PAC.layoutsFileText = function (data) {
  const tpl = t => {
    const head = { id: t.id, name: t.name, settings: t.settings || {} };
    const items = (t.items || []).map(i => '        ' + JSON.stringify(i)).join(',\n');
    return `    {\n      "id": ${JSON.stringify(head.id)},\n      "name": ${JSON.stringify(head.name)},\n      "settings": ${JSON.stringify(head.settings)},\n      "items": [${items ? '\n' + items + '\n      ' : ''}]\n    }`;
  };
  return `/*
 * GPHS PAC — layout templates shown in the layout tool's New menu ("Empty" is always there too).
 * Edit them in editor.html (Templates tab); it saves straight into this file.
 * Each template: id, name, settings { retractable in|out, operableWall in|out, screens { <screenId>: "down" } }, items [...].
 */
window.PAC = window.PAC || {};

PAC.TEMPLATES_DEFAULT = {
  "version": 1,
  "templates": [
${(data.templates || []).map(tpl).join(',\n')}
  ]
};
`;
};
/* Parse the text of js/layouts.js back into data. */
PAC.parseLayoutsFile = function (text) { const P = {}; new Function('window', 'PAC', text)({}, P); return P.TEMPLATES_DEFAULT || { version: 1, templates: [] }; };
