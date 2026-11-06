// Run: node tests/test.js   (uses the saves in tests/fixtures)
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const N = require("../src/core.js");
const load = f => new Uint8Array(fs.readFileSync(path.join(__dirname, "fixtures", f)));
const early = load("early-career.bin"), full = load("100pct.bin");
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("fixtures are valid profiles with good checksums", () => {
  for (const b of [early, full]) { assert.deepStrictEqual(N.validate(b), []); assert(N.checksumsOk(b)); }
});
t("reads cash and garage", () => {
  assert.strictEqual(N.u32(early, N.OFF.cash), 1150);
  assert.strictEqual(N.readCareer(early, 0).code, "240SX");
  assert.strictEqual(N.u32(full, N.OFF.cash), 170275);
});
t("rebuilding a stock car reproduces the save byte for byte", () => {
  const b = early.slice(); N.setCareerCar(b, 0, "240SX");
  assert.deepStrictEqual(b, early);
});
t("stock part builder matches the stock cars stored in the save", () => {
  const rivals = { MIATA: 32810, FOCUS: 33886, "240SX": 34962, COROLLA: 36038, PEUGOT: 37114 };
  for (const [code, base] of Object.entries(rivals))
    for (let off = 28; off < 776; off += 4) assert.strictEqual(N.stockPart(code, off), N.u32(early, base + off), `${code} @${off}`);
});
t("pickers decode real tuned cars", () => {
  const sky = N.myCarsBase(4), names = N.PICKERS.map(p => p[0]);
  assert.strictEqual(N.readMyCar(full, 4).code, "SKYLINE");
  assert.strictEqual(N.currentPick(full, sky, "SKYLINE", names.indexOf("Widebody")), "KITW04");
  assert.strictEqual(N.currentPick(full, sky, "SKYLINE", names.indexOf("Hood")), "STYLE21");
});
t("add, activate and remove a car", () => {
  const b = early.slice(); N.setCareerCar(b, 2, "SKYLINE"); N.setActive(b, 2);
  assert.strictEqual(N.activeIndex(b), 2);
  N.removeCareerCar(b, 2);
  assert.strictEqual(N.readCareer(b, 2).owned, false);
  assert.strictEqual(N.activeIndex(b), 0);
});
t("max performance and presets", () => {
  const b = early.slice(); N.maxPerformance(b, N.careerBase(0));
  assert.strictEqual(N.perfLevel(b, N.careerBase(0)), "maxed");
  N.presetCareer(b, 1, N.PRESETS.findIndex(p => p.code === "SKYLINE"));
  assert.strictEqual(N.readCareer(b, 1).code, "SKYLINE");
});
t("career import copies progress and keeps cars, cash and name", () => {
  const b = early.slice(); N.importProgress(b); N.fixChecksums(b);
  assert(N.progressLooksImported(b) && N.checksumsOk(b));
  assert.strictEqual(N.u32(b, N.OFF.cash), 1150);
  assert.strictEqual(N.profileName(b), "Profile");
  assert.strictEqual(N.readCareer(b, N.activeIndex(b)).code, "240SX");
  for (let i = 28; i < 1196; i++) assert.strictEqual(b[i], full[i], `car table byte ${i}`);
});
t("dyno tuning: 5 setups of 41 sliders, read and written in game steps", () => {
  const base = N.careerBase(0);
  // The 100% save's first car has its Street X nitrous tuned one notch each way
  assert.deepStrictEqual([0, 1, 2, 3, 4].map(s => N.setupTuned(full, base, s)), [false, false, false, true, false]);
  assert.strictEqual(N.getTune(full, base, 3, 16), -1);
  assert.strictEqual(N.getTune(full, base, 3, 17), 1);
  const b = early.slice(), cb = N.careerBase(1);
  N.setTune(b, cb, 2, 20, -6); assert.strictEqual(b[cb + 856 + 2 * 41 + 20], 40);
  N.setTune(b, cb, 2, 9, 99); assert.strictEqual(b[cb + 856 + 2 * 41 + 9], 200);
  N.applyTunePreset(b, cb, 1, "drag"); assert(N.setupTuned(b, cb, 1));
  for (let k = 0; k < 41; k++) assert(b[cb + 856 + 41 + k] % 10 === 0 && b[cb + 856 + 41 + k] <= 200);
  N.copySetup(b, cb, 1, 4); assert.deepStrictEqual(b.slice(cb + 856 + 41, cb + 856 + 82), b.slice(cb + 856 + 164, cb + 856 + 205));
  N.resetSetup(b, cb, 1); assert(!N.setupTuned(b, cb, 1));
  // nothing outside the tuning block moved
  const o = early.slice(); for (let i = 0; i < b.length; i++) if (i < cb + 856 || i >= cb + 1061) assert.strictEqual(b[i], o[i]);
  const all = N.TUNE_GROUPS.flatMap(g => g[1].map(it => it[0])).sort((x, y) => x - y);
  assert.deepStrictEqual(all, Array.from({ length: 41 }, (_, i) => i));
});
console.log(`\n${n} tests passed`);
