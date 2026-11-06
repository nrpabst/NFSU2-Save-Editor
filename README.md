# NFSU2 Save Editor for nfsu2.xyz

A save editor for [nfsu2.xyz](https://nfsu2.xyz), the site that lets you play Need for Speed Underground 2 in a web browser. Download a save backup from nfsu2.xyz, edit it with this tool, then restore it on the site. It's a single Windows .exe (or an HTML file if you prefer). No install, and no upload: your save stays on your computer.

> Built for and tested with nfsu2.xyz backups. It uses the same profile format as the PC game, but it has only been tested on nfsu2.xyz.

## Features

- Set your cash
- Unlock 100% career progress, keeping your own cars
- Add, swap or remove garage cars, including 12 fully modded builds
- Max out performance in one click
- Body kits, widebodies, hoods, lights and more
- Quick Race garage editing
- Writes valid checksums, so nfsu2.xyz doesn't flag the save as edited

## Usage

1. Download `NFSU2-Save-Editor.exe` from [Releases](https://github.com/nrpabst/NFSU2-Save-Editor/releases/latest) and run it.
2. On [nfsu2.xyz](https://nfsu2.xyz), open **Profiles** and click **Download backup**.
3. Drop your profile from the backup (`NFS Underground 2/<profile>/<profile>`) into the editor.
4. Make your edits, click **Save edited profile**, and save it over the profile in the backup.
5. Click **Restore** on nfsu2.xyz and pick the edited backup.

Keep your original backup.

Windows may say it "protected your PC" the first time, because the exe isn't signed. Click **More info**, then **Run anyway**. The exe uses the WebView2 runtime that comes with Windows 10 and 11.

Not on Windows? Open `dist/NFSU2-Save-Editor.html` in any browser instead. It works the same, but the save button downloads the file.

## Development

```
npm test        # run tests
npm run build   # rebuild dist/NFSU2-Save-Editor.html
npm run exe     # build dist/NFSU2-Save-Editor.exe (needs Go, cross-compiles from any OS)
```

The save format is documented in [docs/SAVE-FORMAT.md](docs/SAVE-FORMAT.md).
