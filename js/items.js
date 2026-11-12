/*
 * Item catalogue, built from js/inventory.js (PAC.INVENTORY_DEFAULT).
 * Sizes in mm. Rotation: rot 0 = item faces north/up (front edge at -y); rot 90 faces east (towards the stage).
 */
window.PAC = window.PAC || {};

PAC.CLOTH_OVERHANG = 120; // mm drawn beyond the table edge
PAC.DRAW_KINDS = {
  chair:   { label: 'Chair (seat rows, linking, compliance)', z: 3 },
  table:   { label: 'Table (tablecloth option)', z: 2 },
  rostra:  { label: 'Rostra / platform', z: 1 },
  lectern: { label: 'Lectern', z: 4 },
  mic:     { label: 'Microphone (coloured dot with tag)', z: 6 },
  box:     { label: 'Box (coloured rectangle with name)', z: 2 },
  round:   { label: 'Round (coloured circle / oval with name)', z: 2 },
  label:   { label: 'Text label', z: 7 },
};
PAC.PROTECTED_ITEMS = ['chair', 'label']; // the layout tool relies on these

/* Build PAC.CATALOG / PAC.CATEGORY_ORDER from inventory data. */
PAC.applyInventory = function (inv) {
  PAC.INVENTORY = inv;
  const cats = (inv.categories || []).slice();
  const cat = {};
  for (const d of inv.items || []) {
    if (!d || !d.id) continue;
    const draw = PAC.DRAW_KINDS[d.draw] ? d.draw : 'box';
    if (d.category && !cats.includes(d.category)) cats.push(d.category);
    cat[d.id] = {
      name: d.name || d.id, cat: d.category || cats[0] || 'Other', w: +d.w || 0, h: +d.h || 0,
      max: d.max == null || d.max === '' ? null : +d.max, defRot: +d.defRot || 0, draw,
      z: PAC.DRAW_KINDS[draw].z, cloth: !!d.cloth, free: !!d.free, tag: d.tag || '', color: d.color || '', desc: d.desc || '',
    };
  }
  PAC.CATALOG = cat;
  PAC.CATEGORY_ORDER = cats;
};
PAC.INVENTORY_FILE = JSON.parse(JSON.stringify(PAC.INVENTORY_DEFAULT || { categories: [], items: [] }));
PAC.applyInventory(JSON.parse(JSON.stringify(PAC.INVENTORY_FILE)));

/* Size of an item (labels depend on their text). */
PAC.itemSize = function (it) {
  if (it.type === 'label') {
    const s = it.size || 450;
    const lines = String(it.text || 'Label').split('\n');
    const longest = Math.max.apply(null, lines.map(l => l.length || 1));
    return { w: Math.max(400, longest * s * 0.56), h: lines.length * s * 1.2 };
  }
  const c = PAC.CATALOG[it.type] || { w: 300, h: 300 };
  return { w: c.w, h: c.h };
};

/* World-space corners of an item, optionally padded. */
PAC.itemCorners = function (it, pad) {
  pad = pad || 0;
  const s = PAC.itemSize(it);
  let w = s.w, h = s.h;
  if (it.cloth) { w += 2 * PAC.CLOTH_OVERHANG; h += 2 * PAC.CLOTH_OVERHANG; }
  w = w / 2 + pad; h = h / 2 + pad;
  const a = (it.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  return [[-w, -h], [w, -h], [w, h], [-w, h]].map(p => [it.x + p[0] * c - p[1] * sn, it.y + p[0] * sn + p[1] * c]);
};

function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
PAC.esc = esc;

const FONT = 'font-family="Helvetica, Arial, sans-serif"';
PAC.FONT = FONT;

/* Darker shade of a #rrggbb colour (for outlines). */
function shade(hex, f) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#374151';
  const n = parseInt(m[1], 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
/* Text that fits inside w × h, kept readable whichever way the item/view is rotated. */
function fitText(txt, w, h, it, o, fill) {
  const s = Math.max(60, Math.min(h * 0.42, (w * 0.9) / (Math.max(3, txt.length) * 0.58)));
  const flip = ((((it.rot || 0) + (o.viewRot || 0)) % 360) + 360) % 360;
  const up = flip > 90 && flip < 270 ? ' rotate(180)' : '';
  return `<g transform="scale(1)${up}"><text x="0" y="${(s * 0.35).toFixed(0)}" text-anchor="middle" font-size="${s.toFixed(0)}" fill="${fill}" ${FONT}>${esc(txt)}</text></g>`;
}

/* Draw an item centred at the origin, unrotated. o.sw(px) returns stroke-width attributes. */
PAC.drawItem = function (it, o) {
  const c = PAC.CATALOG[it.type];
  if (!c) return '';
  const sw = o.sw, w = c.w, h = c.h;
  switch (c.draw) {
    case 'chair': {
      const back = it.link ? o.linkColor(it.link) : '#9aa1ab';
      return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${w * 0.15}" fill="#ffffff" stroke="#3b3f46" ${sw(1)}/>` +
        `<rect x="${-w / 2}" y="${h / 2 - h * 0.2}" width="${w}" height="${h * 0.2}" rx="${w * 0.09}" fill="${back}" stroke="#3b3f46" ${sw(1)}/>`;
    }
    case 'table': {
      const ov = PAC.CLOTH_OVERHANG;
      if (it.cloth) {
        return `<rect x="${-w / 2 - ov}" y="${-h / 2 - ov}" width="${w + 2 * ov}" height="${h + 2 * ov}" rx="40" fill="#15171a" stroke="#000" ${sw(1)}/>` +
          `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none" stroke="#5b6068" stroke-dasharray="60 50" ${sw(1)}/>`;
      }
      return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#d8bf92" stroke="#6b5530" ${sw(1)}/>`;
    }
    case 'rostra':
      return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#aeb9c6" stroke="#3d4a5a" ${sw(1.2)}/>` +
        `<path d="M${-w / 2} ${-h / 2} L${w / 2} ${h / 2} M${w / 2} ${-h / 2} L${-w / 2} ${h / 2}" stroke="#8796a8" ${sw(0.6)} fill="none"/>` +
        fitText('ROSTRA', w * 0.6, h * 0.5, it, o, '#26313f');
    case 'lectern': {
      const sx = w / 600, sy = h / 500;
      return `<g transform="scale(${sx} ${sy})"><path d="M-300 -250 L300 -250 L250 250 L-250 250 Z" fill="#5a3d26" stroke="#2a1b10" ${sw(1)}/>` +
        `<line x1="0" y1="-60" x2="0" y2="-380" stroke="#111" ${sw(1.5)}/>` +
        `<circle cx="0" cy="-400" r="45" fill="#111"/>` +
        `<text x="0" y="110" text-anchor="middle" font-size="150" fill="#fff" ${FONT}>LECTERN</text></g>`;
    }
    case 'mic': {
      const r = Math.min(w, h) / 2, num = o.avNumber ? o.avNumber(it) : '';
      const txt = (c.tag || c.name.slice(0, 2).toUpperCase()) + num;
      return `<circle r="${r}" fill="${c.color || '#c2410c'}" stroke="#fff" ${sw(1.5)}/>` +
        `<g transform="rotate(${-(it.rot || 0) - (o.viewRot || 0)})"><text x="0" y="${r * 0.29}" text-anchor="middle" font-size="${(r * 0.8 / Math.max(1, txt.length / 2.6)).toFixed(0)}" font-weight="bold" fill="#fff" ${FONT}>${esc(txt)}</text></g>`;
    }
    case 'round': {
      const col = c.color || '#93c5fd';
      return `<ellipse rx="${w / 2}" ry="${h / 2}" fill="${col}" stroke="${shade(col, 0.6)}" ${sw(1)}/>` + fitText(c.tag || c.name, w * 0.75, h * 0.75, it, o, '#111827');
    }
    case 'label': {
      const s = it.size || 450;
      const lines = String(it.text || 'Label').split('\n');
      const total = lines.length * s * 1.2;
      return lines.map((l, i) => `<text x="0" y="${-total / 2 + s * (i + 0.95)}" text-anchor="middle" font-size="${s}" font-weight="bold" fill="${it.color || '#1d3a6b'}" ${FONT}>${esc(l)}</text>`).join('');
    }
    default: { // box
      const col = c.color || '#cbd5e1';
      return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.06}" fill="${col}" stroke="${shade(col, 0.6)}" ${sw(1)}/>` +
        `<line x1="${-w * 0.3}" y1="${-h / 2}" x2="${w * 0.3}" y2="${-h / 2}" stroke="${shade(col, 0.4)}" ${sw(2.5)}/>` + // front edge marker
        fitText(c.tag || c.name, w, h, it, o, '#111827');
    }
  }
};

/* Small preview icon for the palette / editor (SVG string, viewBox fitted). */
PAC.paletteIcon = function (type, size) {
  const c = PAC.CATALOG[type];
  if (!c) return '';
  const it = { type, x: 0, y: 0, rot: 0, text: 'Abc', size: 450 };
  const s = c.draw === 'label' ? { w: 1200, h: 600 } : { w: c.w || 300, h: c.h || 300 };
  const m = Math.max(s.w, s.h) * 0.62 + 60;
  const px = size || 34;
  return `<svg viewBox="${-m} ${-m} ${2 * m} ${2 * m}" width="${px}" height="${px}" aria-hidden="true">${PAC.drawItem(it, {
    sw: v => `stroke-width="${v * m / 30}"`, linkColor: () => '#4f7cbf', avNumber: () => '',
  })}</svg>`;
};
