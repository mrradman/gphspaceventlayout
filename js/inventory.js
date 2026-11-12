/*
 * GPHS PAC — items that can be placed in the layout tool, and their categories.
 * Last edited with the editor (Items & categories tab) on 13/11/2026, 9:28:35 am; it saves straight into this file.
 *
 * Item fields: id (fixed key used in saved layouts), name, category, w × h (mm), max (null = no limit),
 * draw (chair | table | rostra | lectern | mic | box | round | label), defRot (0 = faces up/north, 90 = faces the stage),
 * cloth (black tablecloth available, one per item), free (may be placed anywhere, not checked against rooms),
 * tag (short text shown on it), color (for mic / box / round), desc (tooltip).
 */
window.PAC = window.PAC || {};

PAC.INVENTORY_DEFAULT = {
  "version": 1,
  "categories": [
    "Seating",
    "Tables",
    "Staging",
    "AV",
    "Notes"
  ],
  "items": [
    {
      "id": "chair",
      "name": "Chair",
      "category": "Seating",
      "w": 450,
      "h": 500,
      "max": 236,
      "draw": "chair",
      "defRot": 90,
      "desc": "450 c/c, no arms, link in groups of 4–16"
    },
    {
      "id": "table1500",
      "name": "Table 1500 × 750",
      "category": "Tables",
      "w": 1500,
      "h": 750,
      "max": 20,
      "draw": "table",
      "defRot": 0,
      "cloth": true,
      "desc": "Black tablecloth available"
    },
    {
      "id": "table600",
      "name": "Table 600 × 600",
      "category": "Tables",
      "w": 600,
      "h": 600,
      "max": 110,
      "draw": "table",
      "defRot": 0,
      "cloth": true,
      "desc": "Black tablecloth available"
    },
    {
      "id": "rostra",
      "name": "Rostra 2.4 × 1.8 m",
      "category": "Staging",
      "w": 1800,
      "h": 2400,
      "max": 1,
      "draw": "rostra",
      "defRot": 270,
      "desc": "Stage platform"
    },
    {
      "id": "lectern",
      "name": "Lectern + mic",
      "category": "AV",
      "w": 600,
      "h": 500,
      "max": 1,
      "draw": "lectern",
      "defRot": 270
    },
    {
      "id": "micHandheld",
      "name": "Handheld mic",
      "category": "AV",
      "w": 380,
      "h": 380,
      "max": 4,
      "draw": "mic",
      "defRot": 0,
      "free": true,
      "tag": "HH",
      "color": "#c2410c"
    },
    {
      "id": "micLapel",
      "name": "Lapel mic",
      "category": "AV",
      "w": 380,
      "h": 380,
      "max": 2,
      "draw": "mic",
      "defRot": 0,
      "free": true,
      "tag": "LP",
      "color": "#7c3aed"
    },
    {
      "id": "micHeadset",
      "name": "Headset mic",
      "category": "AV",
      "w": 380,
      "h": 380,
      "max": 2,
      "draw": "mic",
      "defRot": 0,
      "free": true,
      "tag": "HS",
      "color": "#0f766e"
    },
    {
      "id": "label",
      "name": "Text label",
      "category": "Notes",
      "w": 0,
      "h": 0,
      "max": null,
      "draw": "label",
      "defRot": 0,
      "free": true
    }
  ]
};
