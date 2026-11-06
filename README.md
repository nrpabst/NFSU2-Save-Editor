# NFSU2 Save Editor for nfsu2.xyz

Edit your Need for Speed Underground 2 save from [nfsu2.xyz](https://nfsu2.xyz), the site that runs the game in your web browser. Give yourself cash, unlock the whole career, and build the garage you want.

**[Open the editor online](https://nrpabst.github.io/NFSU2-Save-Editor/)** · **[Download for Windows](https://github.com/nrpabst/NFSU2-Save-Editor/releases/latest)**

## One editor, three ways to run it

They all do exactly the same thing, with the same features. Pick whichever you like.

| | How | Good to know |
|---|---|---|
| **Online** | [Open the link](https://nrpabst.github.io/NFSU2-Save-Editor/) | Nothing to download, always the latest version |
| **Windows app** | Download `NFSU2-Save-Editor.exe` from [Releases](https://github.com/nrpabst/NFSU2-Save-Editor/releases/latest) | Opens in its own window and updates itself |
| **HTML file** | Download `NFSU2-Save-Editor.html` from [Releases](https://github.com/nrpabst/NFSU2-Save-Editor/releases/latest) and open it in any browser | Works offline, and tells you when there's a new version |

Your save is never uploaded, even online. The editor runs on your computer and the file stays there.

## Features

- Set your cash
- Unlock 100% career progress, keeping your own cars
- Add, swap or remove garage cars, including 12 fully modded builds
- Max out performance in one click
- Body kits, widebodies, hoods, lights and more
- Quick Race garage editing
- Writes valid checksums, so nfsu2.xyz doesn't flag the save as edited

## How to edit your save

1. On nfsu2.xyz, open **Profiles** and click **Download backup**.
2. Open the editor and drop in your profile from the backup. It's the file named after your profile, in `NFS Underground 2/<profile>/`.
3. Make your changes and save the edited profile.
4. Put it back in the backup, then click **Restore** on nfsu2.xyz.

Keep a copy of your original backup, just in case.

**Windows says it "protected your PC"?** That happens because the exe isn't signed. Click **More info**, then **Run anyway**. The app uses Microsoft's WebView2, which is already part of Windows 10 and 11.

## For developers

```
npm test        # run the tests
npm run build   # build dist/NFSU2-Save-Editor.html
npm run exe     # build dist/NFSU2-Save-Editor.exe (needs Go, works on any OS)
```

To release, bump `version` in `package.json`, add an entry to `CHANGELOG.md` and push to `main`. GitHub Actions then builds both files, publishes the release and updates the online version. The save format is documented in [docs/SAVE-FORMAT.md](docs/SAVE-FORMAT.md).
