/*
 * GPHS Performing Arts Centre (Building B00P) — building data.
 * Traced from BKA drawing A111 Rev 10; last edited with the building editor on 13/11/2026, 9:34:06 am.
 * Units: mm. Origin: grid 1 / grid E. y increases to the south.
 * Edit with "Edit building" in the app (it saves straight into this file once the website folder is connected).
 *
 * Doors: host 'room:<hall|stage|lc1|lc2>' | 'ctx:<n>' (other room) | 'wall:<n>' (added wall);
 * side = wall of the room (or, for added walls, the face it opens towards); at = centre along the wall;
 * w = opening width; type swing|sliding; leaves 1|2; swing out|in; hinge left|right (pocket side for sliders).
 */
window.PAC = window.PAC || {};

PAC.BUILDING_DEFAULT = {
  "version": 1,
  "grid": {
    "x": {
      "1": 0,
      "2": 3200,
      "3": 10100,
      "4": 16700,
      "5": 23900,
      "6": 31100,
      "7": 38300,
      "8": 44900,
      "9": 49400,
      "10": 56300
    },
    "y": {
      "E": 0,
      "D": 3000,
      "C": 8600,
      "B": 14800,
      "A": 20400
    }
  },
  "rooms": {
    "hall": {
      "code": "PR0007",
      "name": "Auditorium",
      "sub": "Performance Hall",
      "area": 325.5,
      "x": 17050,
      "y": 2700,
      "w": 19950,
      "h": 18000
    },
    "stage": {
      "code": "PR0019",
      "name": "Stage",
      "sub": "approx. +580 mm above hall",
      "area": 116.8,
      "x": 37000,
      "y": 2700,
      "w": 7950,
      "h": 16150
    },
    "lc1": {
      "code": "PR0001",
      "name": "Learning Centre 1",
      "sub": "",
      "area": 60.1,
      "x": 3000,
      "y": 2700,
      "w": 7100,
      "h": 9050
    },
    "lc2": {
      "code": "PR0015",
      "name": "Learning Centre 2",
      "sub": "",
      "area": 60,
      "x": 3000,
      "y": 11750,
      "w": 7100,
      "h": 9000
    }
  },
  "operableWall": {
    "x": 3000,
    "y": 11650,
    "w": 7200,
    "h": 200
  },
  "operableStack": {
    "x": 1900,
    "y": 11450,
    "w": 1000,
    "h": 1400
  },
  "proscenium": [
    {
      "x": 38200,
      "y": 2700,
      "w": 200,
      "h": 3450,
      "name": "Proscenium wall"
    },
    {
      "x": 38200,
      "y": 17250,
      "w": 200,
      "h": 1650,
      "name": "Proscenium wall"
    },
    {
      "name": "Wall",
      "w": 200,
      "h": 7900,
      "x": 1700,
      "y": 7750
    },
    {
      "name": "Wall",
      "w": 1200,
      "h": 200,
      "x": 1800,
      "y": 15450
    },
    {
      "name": "Wall",
      "w": 1250,
      "h": 200,
      "x": 1750,
      "y": 7700
    },
    {
      "name": "Wall",
      "w": 1150,
      "h": 100,
      "x": 1800,
      "y": 11350
    },
    {
      "name": "Wall",
      "w": 1150,
      "h": 150,
      "x": 1900,
      "y": 12850
    },
    {
      "name": "Wall",
      "w": 7050,
      "h": 200,
      "x": 10100,
      "y": 2600
    },
    {
      "name": "Wall",
      "w": 7250,
      "h": 200,
      "x": 10000,
      "y": 20600
    },
    {
      "name": "Wall",
      "w": 3850,
      "h": 200,
      "x": 17100,
      "y": 18200
    },
    {
      "name": "Wall",
      "w": 200,
      "h": 2350,
      "x": 20750,
      "y": 18250
    },
    {
      "name": "Wall",
      "w": 200,
      "h": 2200,
      "x": 18100,
      "y": 18400
    },
    {
      "name": "Wall",
      "w": 200,
      "h": 2400,
      "x": 20750,
      "y": 2800
    },
    {
      "name": "Wall",
      "w": 200,
      "h": 2500,
      "x": 18100,
      "y": 2700
    },
    {
      "name": "Wall",
      "w": 3850,
      "h": 200,
      "x": 17050,
      "y": 5000
    },
    {
      "name": "Wall",
      "w": 19600,
      "h": 300,
      "x": 37000,
      "y": 20500
    },
    {
      "name": "Wall",
      "w": 300,
      "h": 18100,
      "x": 56300,
      "y": 2550
    },
    {
      "name": "Wall",
      "w": 11650,
      "h": 250,
      "x": 44900,
      "y": 2600
    },
    {
      "name": "Wall",
      "w": 4400,
      "h": 150,
      "x": 45000,
      "y": 17900
    },
    {
      "name": "Wall",
      "w": 200,
      "h": 17900,
      "x": 49250,
      "y": 2750
    }
  ],
  "retractable": {
    "seats": 193,
    "rows": [
      {
        "label": "A",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "B",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "C",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "D",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "E",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "F",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "G",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "H",
        "blocks": [
          6,
          -2,
          9,
          -2,
          6
        ]
      },
      {
        "label": "J",
        "blocks": [
          25
        ]
      }
    ],
    "out": {
      "x": 17150,
      "y": 5400,
      "w": 7200,
      "h": 12450
    },
    "stowed": {
      "x": 17150,
      "y": 5400,
      "w": 1600,
      "h": 12450
    }
  },
  "screens": [
    {
      "id": "stage",
      "name": "Stage screen",
      "x": 40350,
      "y": 7150,
      "w": 150,
      "h": 8850
    },
    {
      "id": "lc1",
      "name": "Learning Centre 1 screen",
      "x": 4950,
      "y": 11450,
      "w": 3000,
      "h": 150
    },
    {
      "id": "lc2",
      "name": "Learning Centre 2 screen",
      "x": 4850,
      "y": 20450,
      "w": 3000,
      "h": 150
    }
  ],
  "contextRooms": [
    {
      "name": "Box Office",
      "x": 12200,
      "y": 5050,
      "w": 2200,
      "h": 3200
    },
    {
      "name": "Office / First Aid",
      "x": 14400,
      "y": 5050,
      "w": 2550,
      "h": 3200
    },
    {
      "name": "Toilets",
      "x": 12200,
      "y": 8250,
      "w": 4950,
      "h": 8450
    },
    {
      "name": "Table Store",
      "x": 12200,
      "y": 16700,
      "w": 3050,
      "h": 1700
    },
    {
      "name": "Air Lock",
      "x": 18250,
      "y": 2800,
      "w": 2500,
      "h": 2200
    },
    {
      "name": "Air Lock",
      "x": 18300,
      "y": 18400,
      "w": 2450,
      "h": 2200
    },
    {
      "name": "Holding Area",
      "x": 45000,
      "y": 2800,
      "w": 4400,
      "h": 15200
    },
    {
      "name": "Large Equipment Store",
      "x": 49400,
      "y": 2800,
      "w": 6900,
      "h": 3600
    },
    {
      "name": "Change Rooms",
      "x": 49400,
      "y": 6400,
      "w": 6900,
      "h": 11450
    },
    {
      "name": "Chair Store",
      "x": 49400,
      "y": 17850,
      "w": 6900,
      "h": 2600
    },
    {
      "name": "Chair Store",
      "w": 1000,
      "h": 3400,
      "x": 1900,
      "y": 7900
    },
    {
      "name": "TV Store",
      "w": 1000,
      "h": 2500,
      "x": 1900,
      "y": 12950
    },
    {
      "name": "Stairs",
      "w": 1700,
      "h": 1700,
      "x": 15250,
      "y": 16700
    },
    {
      "name": "Ramp",
      "w": 7900,
      "h": 1550,
      "x": 37100,
      "y": 18950
    }
  ],
  "outdoor": [],
  "doors": [
    {
      "name": "Auditorium NW (air lock)",
      "host": "room:hall",
      "side": "n",
      "at": 25225,
      "w": 2350,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Auditorium north",
      "host": "room:hall",
      "side": "n",
      "at": 29700,
      "w": 2300,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Auditorium south (Breakout)",
      "host": "room:hall",
      "side": "s",
      "at": 27525,
      "w": 2250,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Stage NE (Holding Area)",
      "host": "room:stage",
      "side": "e",
      "at": 5225,
      "w": 1850,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Stage SE (Holding Area)",
      "host": "room:stage",
      "side": "e",
      "at": 16650,
      "w": 1900,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "right",
      "egress": true
    },
    {
      "name": "Learning Centre 1 north",
      "host": "room:lc1",
      "side": "n",
      "at": 6650,
      "w": 2300,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Learning Centre 1 to Foyer",
      "host": "room:lc1",
      "side": "e",
      "at": 4975,
      "w": 3250,
      "type": "sliding",
      "leaves": 1,
      "swing": "out",
      "hinge": "right",
      "egress": false
    },
    {
      "name": "Learning Centre 2 south",
      "host": "room:lc2",
      "side": "w",
      "at": 17862.5,
      "w": 2175,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Learning Centre 2 east",
      "host": "room:lc2",
      "side": "e",
      "at": 18425,
      "w": 3250,
      "type": "sliding",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Learning Centre 1 exit 3",
      "host": "room:lc1",
      "side": "w",
      "at": 5550,
      "w": 2200,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Wall 8 door 1",
      "host": "wall:7",
      "side": "n",
      "at": 13425,
      "w": 2150,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Wall 9 door 1",
      "host": "wall:8",
      "side": "s",
      "at": 16025,
      "w": 850,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "right",
      "egress": true
    },
    {
      "name": "Wall 11 door 1",
      "host": "wall:10",
      "side": "w",
      "at": 19500,
      "w": 900,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 12 door 1",
      "host": "wall:11",
      "side": "w",
      "at": 19500,
      "w": 900,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 13 door 1",
      "host": "wall:12",
      "side": "w",
      "at": 4375,
      "w": 950,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 14 door 1",
      "host": "wall:13",
      "side": "w",
      "at": 4375,
      "w": 950,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 16 door 1",
      "host": "wall:15",
      "side": "s",
      "at": 47450,
      "w": 2000,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Wall 19 door 1",
      "host": "wall:18",
      "side": "s",
      "at": 47300,
      "w": 1900,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Wall 20 door 1",
      "host": "wall:19",
      "side": "w",
      "at": 5125,
      "w": 2150,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 18 door 1",
      "host": "wall:17",
      "side": "n",
      "at": 47425,
      "w": 2050,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    },
    {
      "name": "Wall 20 door 2",
      "host": "wall:19",
      "side": "e",
      "at": 12800,
      "w": 900,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Holding Area door 1",
      "host": "ctx:6",
      "side": "e",
      "at": 9975,
      "w": 950,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 20 door 3",
      "host": "wall:19",
      "side": "e",
      "at": 7100,
      "w": 900,
      "type": "swing",
      "leaves": 1,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 20 door 4",
      "host": "wall:19",
      "side": "w",
      "at": 19100,
      "w": 1900,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": false
    },
    {
      "name": "Wall 18 door 2",
      "host": "wall:17",
      "side": "n",
      "at": 54875,
      "w": 1950,
      "type": "swing",
      "leaves": 2,
      "swing": "out",
      "hinge": "left",
      "egress": true
    }
  ]
};
