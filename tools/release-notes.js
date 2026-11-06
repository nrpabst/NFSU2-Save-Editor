// Prints the CHANGELOG.md section for one version, plus download notes, for a release.
// Usage: node tools/release-notes.js 1.2.0
const fs = require("fs");
const path = require("path");
const v = process.argv[2];
const log = fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
const m = log.match(new RegExp(`^## ${v.replace(/\./g, "\\.")}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
console.log((m ? m[1].trim() : "See the README for what's new.") + `

**Downloads:** \`NFSU2-Save-Editor.exe\` for Windows, or \`NFSU2-Save-Editor.html\` for any browser. They're the same editor. You can also use it online without downloading anything: https://nrpabst.github.io/NFSU2-Save-Editor/

The exe isn't signed, so Windows may show "Windows protected your PC" the first time. Click **More info**, then **Run anyway**.`);
