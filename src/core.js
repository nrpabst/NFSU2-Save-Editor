// ===== NFSU2 save core (no DOM) =====
// Data learned from a finished (100%) save lives in data.js; the build inlines it, Node loads it here.
if (typeof module !== "undefined" && typeof PRESETS === "undefined") {
  var { PRESETS, OBS_GENERIC, PROGRESS100, MAXPERF, CAR_UNLOCKS100 } = require("./data.js");
}

const NFS = (() => {
  const SAVE_SIZE = 54966;
  const OFF = {
    cash: 0xA16A,             // u32 LE
    carTable: 0x28,           // 31 x 24 bytes: [hash][float][1][1][index][0]
    myCars: 1196, myCarsSize: 1072, myCarsCount: 20,
    career: 22636, careerSize: 2034, careerCount: 5,
    activeCareerId: 44415,    // id of the career car shown/selected
    firstMyCarsId: 50639,
    profileName: 53797,
  };
  const CARS = [
    ["PEUGOT", "Peugeot 206"], ["FOCUS", "Ford Focus ZX3"], ["COROLLA", "Toyota Corolla GT-S"],
    ["240SX", "Nissan 240SX"], ["MIATA", "Mazda MX-5 Miata"], ["CIVIC", "Honda Civic"],
    ["PEUGOT106", "Peugeot 106"], ["CORSA", "Vauxhall/Opel Corsa"], ["HUMMER", "Hummer H2"],
    ["NAVIGATOR", "Lincoln Navigator"], ["ESCALADE", "Cadillac Escalade"], ["TIBURON", "Hyundai Tiburon"],
    ["SENTRA", "Nissan Sentra SE-R"], ["CELICA", "Toyota Celica"], ["IS300", "Lexus IS300"],
    ["SUPRA", "Toyota Supra"], ["GOLF", "Volkswagen Golf GTI"], ["A3", "Audi A3"],
    ["RSX", "Acura RSX"], ["ECLIPSE", "Mitsubishi Eclipse"], ["TT", "Audi TT"],
    ["RX8", "Mazda RX-8"], ["350Z", "Nissan 350Z"], ["G35", "Infiniti G35"],
    ["3000GT", "Mitsubishi 3000GT"], ["GTO", "Pontiac GTO"], ["MUSTANGGT", "Ford Mustang GT"],
    ["SKYLINE", "Nissan Skyline GT-R"], ["LANCEREVO8", "Mitsubishi Lancer Evo VIII"], ["RX7", "Mazda RX-7"],
    ["IMPREZAWRX", "Subaru Impreza WRX STi"],
  ];

  // EA "bin" string hash
  function bh(s, init = 0xFFFFFFFF) {
    let r = init >>> 0;
    for (let i = 0; i < s.length; i++) r = (Math.imul(r, 33) + s.charCodeAt(i)) >>> 0;
    return r;
  }
  function pow33(n) { let r = 1; for (let i = 0; i < n; i++) r = Math.imul(r, 33) >>> 0; return r; }

  // Car-specific part slots: offset in car block -> [suffix length, suffix hash (init 0), known suffix or null]
  // part hash = bh(CAR) * 33^len + tail   (== bh(CAR + suffix))
  const TAILS = {
    28: [5, 0x06dc685a, "_BASE"], 32: [19, 0xfed12279, "_KIT00_FRONT_BUMPER"], 36: [18, 0xd708bb1a, "_KIT00_REAR_BUMPER"],
    48: [11, 0x4f557f54, "_KIT00_BODY"], 52: [12, 0xcc7034ab, "_KITW00_BODY"], 60: [4, 0x003587d2, "_TOP"],
    64: [11, 0x4f58caf0, "_KIT00_HOOD"], 68: [12, 0x3b4d0f3a, "_KIT00_TRUNK"], 72: [12, 0x3b36ed93, "_KIT00_SKIRT"],
    76: [14, 0xf0b9f444, "_KIT00_SPOILER"], 80: [13, 0x81a1711c, "_KIT00_ENGINE"], 84: [16, 0x9d840330, "_KIT00_HEADLIGHT"],
    88: [17, 0x2ad1a923, "_KIT00_BRAKELIGHT"], 92: [14, 0xcd310048, "_KIT00_EXHAUST"], 96: [16, 0x5dd58944, "_KIT00_DOOR_LEFT"],
    100: [17, 0x18f57957, "_KIT00_DOOR_RIGHT"], 104: [22, 0xdc5807d3, "_KIT00_DOOR_PANEL_LEFT"], 108: [23, 0x67c7c9c6, "_KIT00_DOOR_PANEL_RIGHT"],
    112: [21, 0x1ed67957, "_KIT00_DOOR_SILL_LEFT"], 116: [22, 0xfa146bca, "_KIT00_DOOR_SILL_RIGHT"],
    128: [17, 0xf3a9658d, "_KIT00_HOOD_UNDER"], 132: [18, 0xbf163957, "_KIT00_TRUNK_UNDER"],
    136: [18, 0x6c902073, "_KIT00_FRONT_BRAKE"], 140: [18, 0x6c902073, "_KIT00_FRONT_BRAKE"],
    144: [18, 0x6e06b783, "_KIT00_FRONT_WHEEL"], 148: [18, 0x6e06b783, "_KIT00_FRONT_WHEEL"],
    156: [18, 0x5e5281d5, "_KIT00_WING_MIRROR"], 164: [18, 0xbdb0266b, "_KIT00_TRUNK_AUDIO"],
    236: [23, 0x91e05b2e, null], 240: [31, 0x924e351f, null], 244: [30, 0x564ec920, null], 248: [28, 0x951ac882, null],
    252: [29, 0x94259cb5, null], 256: [31, 0x06627d72, null], 260: [32, 0x9588c8c5, null], 264: [34, 0xf6f3a19b, null],
    268: [35, 0x311998ee, null], 272: [37, 0xb0466beb, null], 276: [38, 0x7bea865e, null],
    704: [3, 0x00019d18, "_CV"],
  };
  // Slots identical on every stock car
  const GENERIC = {
    56: 0x0b70e285, 160: 0x53a38e68, 168: 0xfac94705, 172: 0xfac94705, 176: 0x456409ad, 180: 0x456409ad,
    184: 0xfa444e97, 188: 0xfa444e97, 192: 0xfac94705, 196: 0xfac94705, 200: 0xfac94705, 204: 0xfac94705,
    208: 0x456409ad, 212: 0x456409ad, 336: 0xd0561e94, 340: 0xd0561e8d, 344: 0x44d28fae, 348: 0xd0561e8c,
    352: 0xd0561e94, 356: 0xd0561e8d, 360: 0x44d28fae, 364: 0xd0561e8c, 368: 0xd0561e94, 372: 0xd0561e8d,
    376: 0x44d28fae, 380: 0xd0561e8c, 384: 0xd0561e94, 388: 0xd0561e8d, 392: 0x44d28fae, 396: 0xd0561e8c,
    400: 0xc8d313ac, 404: 0xc8d313ac, 408: 0xc8d313ac, 412: 0xc8d313ac, 640: 0x3d263938, 644: 0xa5ac963e,
    648: 0xa5ac963e, 652: 0xa5ac963e, 656: 0xa5ac963e, 660: 0x2471fa9b, 664: 0x03b83203, 668: 0x03b83203,
    672: 0x6411a0f4, 676: 0x66971060, 680: 0x03b83203, 684: 0x03f9e820, 688: 0x03f9e820, 692: 0x03f9e820,
  };
  // Slot 280's name doesn't follow the CAR_ pattern; values seen in this save
  const SLOT280 = { "240SX": 0x98ee4397, MIATA: 0xedcd9a8a, FOCUS: 0xb8bcbde5, COROLLA: 0xedcd9aa5, PEUGOT: 0x2d392ee5 };

  const SLOT_LABELS = {
    28: "Base model", 32: "Front bumper", 36: "Rear bumper", 48: "Body", 52: "Widebody body", 56: "Roof",
    60: "Top", 64: "Hood", 68: "Trunk", 72: "Side skirts", 76: "Spoiler", 80: "Engine", 84: "Headlights",
    88: "Brakelights", 92: "Exhaust", 96: "Door (left)", 100: "Door (right)", 104: "Door panel (left)",
    108: "Door panel (right)", 112: "Door sill (left)", 116: "Door sill (right)", 128: "Under hood",
    132: "Under trunk", 136: "Brakes (front)", 140: "Brakes (rear)", 144: "Wheels (front)", 148: "Wheels (rear)",
    156: "Wing mirrors", 160: "License plate", 164: "Trunk audio", 280: "Paint (probably)", 336: "Vinyl layer 1 colour 1",
    340: "Vinyl layer 1 colour 2", 344: "Vinyl layer 1 colour 3", 348: "Vinyl layer 1 colour 4",
    352: "Vinyl layer 2 colour 1", 356: "Vinyl layer 2 colour 2", 360: "Vinyl layer 2 colour 3", 364: "Vinyl layer 2 colour 4",
    368: "Vinyl layer 3 colour 1", 372: "Vinyl layer 3 colour 2", 376: "Vinyl layer 3 colour 3", 380: "Vinyl layer 3 colour 4",
    384: "Vinyl layer 4 colour 1", 388: "Vinyl layer 4 colour 2", 392: "Vinyl layer 4 colour 3", 396: "Vinyl layer 4 colour 4",
    640: "Window tint", 644: "Neon 1", 648: "Neon 2", 652: "Neon 3", 656: "Neon 4", 704: "CV (model)",
  };
  const KITS = ["KIT00"]; for (let i = 1; i <= 30; i++) KITS.push("KIT" + String(i).padStart(2, "0"));
  const STYLES = ["STYLE00"]; for (let i = 1; i <= 30; i++) STYLES.push("STYLE" + String(i).padStart(2, "0"));
  const WIDE = ["KITW00", "KITW01", "KITW02", "KITW03", "KITW04"];
  // Quick pickers: [label, slot offsets, name template ({C}=car, {K}=choice), choices, stock choice]
  const PICKERS = [
    ["Front bumper", [32], "{C}_{K}_FRONT_BUMPER", KITS, "KIT00"],
    ["Rear bumper", [36], "{C}_{K}_REAR_BUMPER", KITS, "KIT00"],
    ["Side skirts", [72], "{C}_{K}_SKIRT", KITS, "KIT00"],
    ["Widebody", [52, 96, 100, 104, 108, 112, 116], null, WIDE, "KITW00"],
    ["Hood", [64], "{C}_{K}_HOOD", ["KIT00"].concat(STYLES.slice(1)), "KIT00"],
    ["Headlights", [84], "{C}_{K}_HEADLIGHT", ["KIT00"].concat(STYLES.slice(1)), "KIT00"],
    ["Brakelights", [88], "{C}_{K}_BRAKELIGHT", ["KIT00"].concat(STYLES.slice(1)), "KIT00"],
    ["Engine", [80], "{C}_{K}_ENGINE", ["KIT00", "STYLE01", "STYLE02", "STYLE03"], "KIT00"],
    ["Trunk audio", [164], "{C}_{K}_TRUNK_AUDIO", KITS.slice(0, 11), "KIT00"],
    ["Brakes", [136], "BRAKE_{K}", ["STOCK"].concat(STYLES.slice(1, 11)), "STOCK"],
  ];
  const WIDE_SUFFIX = { 52: "BODY", 96: "DOOR_LEFT", 100: "DOOR_RIGHT", 104: "DOOR_PANEL_LEFT", 108: "DOOR_PANEL_RIGHT", 112: "DOOR_SILL_LEFT", 116: "DOOR_SILL_RIGHT" };
  function pickerHash(p, code, k, off) {
    if (p[0] === "Widebody") return off === 52 ? bh(`${code}_${k}_BODY`) : bh(`${code}_${k === "KITW00" ? "KIT00" : k}_${WIDE_SUFFIX[off]}`);
    if (p[0] === "Brakes" && k === "STOCK") return stockPart(code, off);
    return bh(p[2].replace("{C}", code).replace("{K}", k));
  }
  function applyPicker(b, base, code, idx, k) { const p = PICKERS[idx]; for (const off of p[1]) w32(b, base + off, pickerHash(p, code, k, off)); }
  function currentPick(b, base, code, idx) {
    const p = PICKERS[idx];
    for (const k of p[3]) if (p[1].every(off => u32(b, base + off) === pickerHash(p, code, k, off))) return k;
    return null;
  }
  // which picker choices were seen on real cars in a finished (100%) save
  const SEEN = {};
  function markSeen(code, blk) {
    PICKERS.forEach((p, i) => { for (const k of p[3]) if (p[1].every(off => u32(blk, off) === pickerHash(p, code, k, off))) (SEEN[i] = SEEN[i] || new Set()).add(k); });
  }

  const XNAME = {}; // hash -> car code
  CARS.forEach(([c]) => { XNAME[bh(c)] = c; });

  // Dictionary for showing part names
  const DICT = {};
  (function buildDict() {
    const add = n => { DICT[bh(n)] = n; };
    for (const st of STYLES) add("BRAKE_" + st);
    for (let i = 0; i < 30; i++) add("BODY_" + String(i).padStart(2, "0"));
    ["ROOF_STYLE00", "LICENSE_PLATE_STYLE01", "WINDOW_TINT_STOCK", "NEON_NONE", "STOCK", "WHITE", "NONE"].forEach(add);
    for (let i = 0; i < 100; i++) {
      const n = String(i).padStart(2, "0");
      for (const k of ["VINYL_L1_COLOR", "VINYL_L2_COLOR", "VINYL_L3_COLOR", "VINYL_L4_COLOR", "ROOF_STYLE",
        "LICENSE_PLATE_STYLE", "SPOILER_STYLE", "HOOD_STYLE", "ROOF_SCOOP_STYLE", "WINDOW_TINT_", "NEON_STYLE"]) add(k + n);
    }
    for (const [c] of CARS) {
      for (const k in TAILS) { const sfx = TAILS[k][2]; if (sfx) { add(c + sfx); for (const kit of KITS) add(c + sfx.replace("KIT00", kit)); } }
      for (const kit of KITS) for (const p of ["FRONT_BUMPER", "REAR_BUMPER", "SKIRT", "BODY", "TRUNK_AUDIO", "HOOD"]) add(`${c}_${kit}_${p}`);
      for (const st of STYLES) for (const p of ["HOOD", "HEADLIGHT", "BRAKELIGHT", "ENGINE"]) add(`${c}_${st}_${p}`);
      for (const w of WIDE) for (const p of Object.values(WIDE_SUFFIX)) add(`${c}_${w}_${p}`);
    }
  })();

  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const w32 = (b, o, v) => { v >>>= 0; b[o] = v & 255; b[o + 1] = (v >>> 8) & 255; b[o + 2] = (v >>> 16) & 255; b[o + 3] = (v >>> 24) & 255; };
  const f32 = (b, o) => new DataView(b.buffer, b.byteOffset + o, 4).getFloat32(0, true);

  function validate(b) {
    const errs = [];
    if (b.length !== SAVE_SIZE) errs.push(`File is ${b.length} bytes; an NFSU2 profile is ${SAVE_SIZE}. Pick the file named after your profile (e.g. "neuneu"), not GARAGE.DAT.`);
    else if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== "20CM") errs.push("Missing the 20CM header, this isn't an NFSU2 profile.");
    return errs;
  }

  function carCodeOf(hash) { return XNAME[hash] || null; }
  function carName(code) { const c = CARS.find(x => x[0] === code); return c ? c[1] : code; }
  function partName(h) { if (!h) return "(none)"; return DICT[h] || null; }

  function stockPart(code, off) {
    if (TAILS[off]) { const [L, t] = TAILS[off]; return (Math.imul(bh(code), pow33(L)) + t) >>> 0; }
    if (off === 280) return SLOT280[code] || 0xb8bcbde5; // unknown cars get a paint seen on stock cars
    return GENERIC[off] || 0;
  }

  function carTableFloat(b, code) {
    const i = CARS.findIndex(x => x[0] === code);
    return i < 0 ? 0 : f32(b, OFF.carTable + i * 24 + 4);
  }
  function carTableFloatRaw(b, code) {
    const i = CARS.findIndex(x => x[0] === code);
    return i < 0 ? 0 : u32(b, OFF.carTable + i * 24 + 4);
  }

  // Careeer slot helpers
  const careerBase = i => OFF.career + i * OFF.careerSize;
  const myCarsBase = i => OFF.myCars + i * OFF.myCarsSize;

  function readCareer(b, i) {
    const o = careerBase(i);
    const owned = b[o + 1069] === 1 && b[o + 16] === 1;
    const x = u32(b, o + 24);
    return { slot: i, base: o, id: u32(b, o), owned, xname: x, code: carCodeOf(x) };
  }
  function readMyCar(b, i) {
    const o = myCarsBase(i);
    const x = u32(b, o + 24);
    return { slot: i, base: o, id: u32(b, o), used: b[o + 8] === 1, xname: x, code: carCodeOf(x) };
  }

  // Write stock visual parts for `code` into block at base (parts region 28..776)
  function writeStockParts(b, base, code) {
    for (let off = 28; off < 776; off += 4) w32(b, base + off, stockPart(code, off));
  }

  function setCareerCar(b, i, code) {
    const o = careerBase(i);
    w32(b, o + 4, carTableFloatRaw(b, code));
    b[o + 8] = 1; b[o + 12] = 4; b[o + 16] = 1;
    w32(b, o + 24, bh(code));
    writeStockParts(b, o, code);
    stockPerformance(b, o);
    b[o + 1069] = 1;
    if (!readCareer(b, activeIndex(b)).owned) w32(b, OFF.activeCareerId, u32(b, o));
  }
  // Swap model but keep slot flags; kit level carried over where possible
  function changeCareerModel(b, i, code) {
    setCareerCar(b, i, code);
  }
  function removeCareerCar(b, i) {
    const o = careerBase(i);
    w32(b, o + 4, 0); b[o + 16] = 0; w32(b, o + 20, 0); w32(b, o + 24, 0);
    for (let off = 28; off < 776; off += 4) w32(b, o + off, 0);
    b[o + 1069] = 0;
    stockPerformance(b, o);
    for (let k = 1072; k < OFF.careerSize; k++) b[o + k] = 0; // bought-parts inventory
    if (activeIndex(b) === i || !readCareer(b, activeIndex(b)).owned) {
      for (let j = 0; j < OFF.careerCount; j++) if (readCareer(b, j).owned) { w32(b, OFF.activeCareerId, readCareer(b, j).id); break; }
    }
  }
  function activeIndex(b) {
    const id = u32(b, OFF.activeCareerId);
    for (let j = 0; j < OFF.careerCount; j++) if (u32(b, careerBase(j)) === id) return j;
    return 0;
  }
  function setActive(b, i) { w32(b, OFF.activeCareerId, u32(b, careerBase(i))); }

  // ---- performance / presets (learned from a 100% save) ----
  function hexBytes(h) { const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }
  const MAXP = MAXPERF.split("|").map(hexBytes);
  function maxPerformance(b, base) { b.set(MAXP[0], base + 708); b.set(MAXP[1], base + 780); }
  function stockPerformance(b, base) { b.fill(0, base + 708, base + 748); b.fill(0, base + 780, base + 856); b.fill(100, base + 856, base + 1061); }
  function perfLevel(b, base) { let n = 0; for (let k = 0; k < 76; k++) if (b[base + 780 + k] === MAXP[1][k]) n++; const any = b.slice(base + 780, base + 856).some(x => x); return !any ? "stock" : n === 76 ? "maxed" : "upgraded"; }
  const PRESET_BLOCKS = PRESETS.map(p => { const bin = atob(p.data); const a = new Uint8Array(bin.length); for (let i = 0; i < a.length; i++) a[i] = bin.charCodeAt(i); return a; });
  PRESETS.forEach((p, i) => markSeen(p.code, PRESET_BLOCKS[i]));
  function applyPreset(b, base, idx, career) {
    const src = PRESET_BLOCKS[idx];
    b.set(src.subarray(4, 8), base + 4);
    b.set(src.subarray(16, 1068), base + 16);
    b[base + 8] = 1; b[base + 12] = career ? 4 : 2; b[base + 16] = 1;
    if (career) { b[base + 1069] = 1; }
  }
  // ---- career progress (copied from the 100% save) ----
  const PROG_START = 39266, PROG_END = 53780;
  const KEEP = [[OFF.cash, 4], [OFF.activeCareerId, 4], [OFF.firstMyCarsId, 4]];
  function importProgress(b) {
    const bin = atob(PROGRESS100), keep = KEEP.map(([o, n]) => [o, b.slice(o, o + n)]);
    for (let i = 0; i < bin.length; i++) b[PROG_START + i] = bin.charCodeAt(i);
    for (const [o, v] of keep) b.set(v, o);
    CAR_UNLOCKS100.forEach((v, r) => w32(b, 44 + r * 24, v));
  }
  function progressLooksImported(b) {
    const bin = atob(PROGRESS100); let same = 0;
    for (let i = 0; i < bin.length; i++) if (b[PROG_START + i] === bin.charCodeAt(i)) same++;
    return same > bin.length - 16;
  }
  function genericOptions(off) { return (OBS_GENERIC[off] || []); }

  // My Cars (Quick Race garage)
  function copyCareerToMyCars(b, ci, mi) {
    const src = careerBase(ci), dst = myCarsBase(mi);
    for (let k = 0; k < OFF.myCarsSize; k++) b[dst + k] = b[src + k];
    let id; do { id = (Math.random() * 0xFFFFFFFF) >>> 0; } while (!id);
    w32(b, dst, id);
    b[dst + 8] = 1; b[dst + 12] = 2;
    b[dst + 1068] = 0; b[dst + 1069] = 0; b[dst + 1070] = 0; b[dst + 1071] = 0;
    fixFirstMyCarsId(b);
  }
  function presetMyCar(b, mi, idx) {
    const dst = myCarsBase(mi);
    let id = u32(b, dst); if (!id) { do { id = (Math.random() * 0xFFFFFFFF) >>> 0; } while (!id); }
    w32(b, dst, id); applyPreset(b, dst, idx, false); fixFirstMyCarsId(b);
  }
  function presetCareer(b, i, idx) {
    const o = careerBase(i); applyPreset(b, o, idx, true);
    if (!readCareer(b, activeIndex(b)).owned) w32(b, OFF.activeCareerId, u32(b, o));
  }
  function setMyCar(b, mi, code) {
    const dst = myCarsBase(mi);
    let id = u32(b, dst); if (!id) { do { id = (Math.random() * 0xFFFFFFFF) >>> 0; } while (!id); }
    w32(b, dst, id);
    w32(b, dst + 4, carTableFloatRaw(b, code));
    b[dst + 8] = 1; b[dst + 12] = 2; b[dst + 16] = 1;
    w32(b, dst + 24, bh(code));
    writeStockParts(b, dst, code);
    stockPerformance(b, dst);
    fixFirstMyCarsId(b);
  }
  function clearMyCar(b, mi) {
    const dst = myCarsBase(mi);
    for (let k = 0; k < OFF.myCarsSize; k++) b[dst + k] = 0;
    b[dst + 12] = 2;
    for (let k = 856; k <= 1060; k++) b[dst + k] = 100;
    fixFirstMyCarsId(b);
  }
  function fixFirstMyCarsId(b) {
    for (let j = 0; j < OFF.myCarsCount; j++) { const id = u32(b, myCarsBase(j)); if (id && b[myCarsBase(j) + 8] === 1) { w32(b, OFF.firstMyCarsId, id); return; } }
    w32(b, OFF.firstMyCarsId, u32(b, OFF.activeCareerId));
  }

  // Profile checksums, as nfsu2.xyz (and the game) check them: CRC-32 (MSB-first) of [28,36), [36,end), [0,24)
  const CRC_T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let e = n << 24; for (let t = 0; t < 8; t++) e = e & 0x80000000 ? (e << 1) ^ 0x04C11DB7 : e << 1; CRC_T[n] = e >>> 0; }
  function crc(n) { let e = ~(n[0] << 24 | n[1] << 16 | n[2] << 8 | n[3]) >>> 0; for (let t = 4; t < n.length; t++) e = ((e << 8 | n[t]) ^ CRC_T[e >>> 24]) >>> 0; return ~e >>> 0; }
  function fixChecksums(b) { w32(b, 16, crc(b.subarray(28, 36))); w32(b, 20, crc(b.subarray(36))); w32(b, 24, crc(b.subarray(0, 24))); return b; }
  function checksumsOk(b) { return u32(b, 16) === crc(b.subarray(28, 36)) && u32(b, 20) === crc(b.subarray(36)) && u32(b, 24) === crc(b.subarray(0, 24)); }
  function profileName(b) { let s = ""; for (let k = OFF.profileName; k < OFF.profileName + 16 && b[k]; k++) s += String.fromCharCode(b[k]); return s; }

  return { SAVE_SIZE, OFF, CARS, TAILS, GENERIC, SLOT_LABELS, KITS, PICKERS, PRESETS, applyPicker, currentPick, SEEN, maxPerformance, stockPerformance, perfLevel, applyPreset, genericOptions, importProgress, progressLooksImported, presetMyCar, presetCareer, bh, u32, w32, f32, validate, carCodeOf, carName, partName,
    stockPart, readCareer, readMyCar, setCareerCar, changeCareerModel, removeCareerCar, activeIndex, setActive,
    copyCareerToMyCars, setMyCar, clearMyCar, profileName, fixChecksums, checksumsOk, careerBase, myCarsBase, carTableFloat };
})();
if (typeof module !== "undefined") module.exports = NFS;
