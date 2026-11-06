// Writes exe/rsrc_windows_amd64.syso: the Windows resources (icon, manifest, version
// info) that `go build` links into NFSU2-Save-Editor.exe. No dependencies.
// Usage: node tools/winres.js <version>   (version like 1.2.0)
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const version = (process.argv[2] || require(path.join(root, "package.json")).version).split(".").map(Number);
while (version.length < 4) version.push(0);
const vstr = version.slice(0, 3).join(".");

const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
const utf16z = s => Buffer.from(s + "\0", "utf16le");
const pad4 = b => b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - b.length % 4)]) : b;

const RT_ICON = 3, RT_GROUP_ICON = 14, RT_VERSION = 16, RT_MANIFEST = 24, LANG = 0x0409;
const res = [];

// ---- icon: split the .ico into RT_ICON images plus one RT_GROUP_ICON ----
const ico = fs.readFileSync(path.join(root, "exe", "winres", "icon.ico"));
const count = ico.readUInt16LE(4);
const group = [u16(0), u16(1), u16(count)];
for (let i = 0; i < count; i++) {
  const e = 6 + i * 16, size = ico.readUInt32LE(e + 8), off = ico.readUInt32LE(e + 12);
  res.push({ type: RT_ICON, id: i + 1, data: ico.subarray(off, off + size) });
  group.push(ico.subarray(e, e + 12), u16(i + 1)); // GRPICONDIRENTRY = ICONDIRENTRY with a 2-byte id
}
res.push({ type: RT_GROUP_ICON, id: 1, data: Buffer.concat(group) });

// ---- manifest: per-monitor DPI, common controls v6, no elevation ----
res.push({ type: RT_MANIFEST, id: 1, data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity type="win32" name="NFSU2SaveEditor" version="${version.join(".")}" processorArchitecture="amd64"/>
  <description>NFSU2 Save Editor</description>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application><supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/></application>
  </compatibility>
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
      <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">permonitorv2,permonitor</dpiAwareness>
    </windowsSettings>
  </application>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security><requestedPrivileges><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security>
  </trustInfo>
  <dependency>
    <dependentAssembly>
      <assemblyIdentity type="win32" name="Microsoft.Windows.Common-Controls" version="6.0.0.0" processorArchitecture="*" publicKeyToken="6595b64144ccf1df" language="*"/>
    </dependentAssembly>
  </dependency>
</assembly>
`, "utf8") });

// ---- version info (shown in the file's Properties > Details) ----
function vnode(key, value, valueLen, type, children = []) {
  let b = pad4(Buffer.concat([u16(0), u16(valueLen), u16(type), utf16z(key)]));
  if (value) b = Buffer.concat([b, value]);
  for (const c of children) b = Buffer.concat([pad4(b), c]);
  b.writeUInt16LE(b.length, 0);
  return b;
}
const str = (k, v) => vnode(k, utf16z(v), v.length + 1, 1);
const ms = version[0] << 16 | version[1], ls = version[2] << 16 | version[3];
const fixed = Buffer.concat([0xFEEF04BD, 0x00010000, ms, ls, ms, ls, 0x3F, 0, 0x40004, 1, 0, 0, 0].map(u32));
res.push({ type: RT_VERSION, id: 1, data: vnode("VS_VERSION_INFO", fixed, fixed.length, 0, [
  vnode("StringFileInfo", null, 0, 1, [vnode("040904B0", null, 0, 1, [
    str("CompanyName", "github.com/nrpabst"),
    str("FileDescription", "NFSU2 Save Editor for nfsu2.xyz"),
    str("FileVersion", vstr),
    str("InternalName", "NFSU2-Save-Editor"),
    str("OriginalFilename", "NFSU2-Save-Editor.exe"),
    str("ProductName", "NFSU2 Save Editor"),
    str("ProductVersion", vstr),
    str("Comments", "https://github.com/nrpabst/NFSU2-Save-Editor"),
  ])]),
  vnode("VarFileInfo", null, 0, 1, [vnode("Translation", Buffer.concat([u16(LANG), u16(1200)]), 4, 0)]),
]) });

// ---- resource directory tree: type -> id -> language -> data entry ----
const types = [...new Set(res.map(r => r.type))].sort((a, b) => a - b);
const dirSize = n => 16 + 8 * n;
const byType = t => res.filter(r => r.type === t).sort((a, b) => a.id - b.id);
let dirBytes = dirSize(types.length);
for (const t of types) dirBytes += dirSize(byType(t).length) + byType(t).length * dirSize(1);
const entryBase = dirBytes, dataBase = entryBase + res.length * 16;

const sec = [], relocs = [];
let pos = 0;
const put = b => { sec.push(b); pos += b.length; };
const dirHdr = n => Buffer.concat([u32(0), u32(0), u16(0), u16(0), u16(0), u16(n)]);
const SUB = 0x80000000;

// Lay out offsets first.
let next = dirSize(types.length);
const typeOff = {}, langOff = new Map();
for (const t of types) { typeOff[t] = next; next += dirSize(byType(t).length); }
for (const t of types) for (const r of byType(t)) { langOff.set(r, next); next += dirSize(1); }
let dataPos = dataBase;
res.forEach((r, i) => { r.entry = entryBase + i * 16; r.dataOff = dataPos; dataPos += Math.ceil(r.data.length / 8) * 8; });

put(dirHdr(types.length));
for (const t of types) put(Buffer.concat([u32(t), u32(SUB | typeOff[t])]));
for (const t of types) {
  put(dirHdr(byType(t).length));
  for (const r of byType(t)) put(Buffer.concat([u32(r.id), u32(SUB | langOff.get(r))]));
}
for (const t of types) for (const r of byType(t)) { put(dirHdr(1)); put(Buffer.concat([u32(LANG), u32(r.entry)])); }
if (pos !== entryBase) throw new Error("layout mismatch");
for (const r of res) { relocs.push(pos); put(Buffer.concat([u32(r.dataOff), u32(r.data.length), u32(0), u32(0)])); }
for (const r of res) { put(r.data); const p = Math.ceil(r.data.length / 8) * 8 - r.data.length; if (p) put(Buffer.alloc(p)); }
const raw = Buffer.concat(sec);

// ---- COFF object: one .rsrc section, ADDR32NB relocations for the data RVAs ----
const IMAGE_REL_AMD64_ADDR32NB = 3;
const rawPtr = 20 + 40, relPtr = rawPtr + raw.length, symPtr = relPtr + relocs.length * 10;
const name8 = s => { const b = Buffer.alloc(8); b.write(s); return b; };
const coff = Buffer.concat([
  u16(0x8664), u16(1), u32(0), u32(symPtr), u32(1), u16(0), u16(0),
  name8(".rsrc"), u32(0), u32(0), u32(raw.length), u32(rawPtr), u32(relPtr), u32(0), u16(relocs.length), u16(0), u32(0x40000040),
  raw,
  ...relocs.map(off => Buffer.concat([u32(off), u32(0), u16(IMAGE_REL_AMD64_ADDR32NB)])),
  name8(".rsrc"), u32(0), u16(1), u16(0), Buffer.from([3, 0]), // static symbol for section 1
  u32(4), // empty string table
]);
const out = path.join(root, "exe", "rsrc_windows_amd64.syso");
fs.writeFileSync(out, coff);
console.log(`wrote ${path.relative(root, out)} (${coff.length} bytes, version ${vstr})`);
