// Builds the single-file trainer: src/ui.html with src/data.js and src/core.js inlined.
// Usage: node tools/build.js   ->   dist/NFSU2-Save-Editor.html
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, "src", f), "utf8");
const strip = s => s.replace(/^if \(typeof module !== "undefined"\)[^\n]*\n?/gm, "")
  .replace(/^if \(typeof module !== "undefined" && typeof PRESETS === "undefined"\) \{\n[^\n]*\n\}\n/m, "");
const core = strip(read("data.js")) + "\n" + strip(read("core.js"));
const html = read("ui.html");
if (!html.includes("/*__CORE__*/")) throw new Error("ui.html is missing the /*__CORE__*/ marker");
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist", "NFSU2-Save-Editor.html");
fs.writeFileSync(out, html.replace("/*__CORE__*/", () => core));
console.log(`wrote ${path.relative(root, out)} (${fs.statSync(out).size} bytes)`);
