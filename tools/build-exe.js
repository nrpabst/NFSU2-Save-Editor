// Builds dist/NFSU2-Save-Editor.exe: the editor page in its own window (WebView2).
// Needs Go 1.21+. Cross-compiles from any OS.  Usage: npm run exe
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", ...opts });

run(process.execPath, [path.join(__dirname, "build.js")]);
fs.copyFileSync(path.join(root, "dist", "NFSU2-Save-Editor.html"), path.join(root, "exe", "editor.html"));
run(process.execPath, [path.join(__dirname, "winres.js")]);
const out = path.join(root, "dist", "NFSU2-Save-Editor.exe");
run("go", ["build", "-trimpath", "-ldflags", "-H windowsgui -s -w", "-o", out, "."], {
  cwd: path.join(root, "exe"),
  env: { ...process.env, GOOS: "windows", GOARCH: "amd64", CGO_ENABLED: "0" },
});
console.log(`wrote ${path.relative(root, out)} (${fs.statSync(out).size} bytes)`);
