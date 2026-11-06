# NFSU2 Save Editor for nfsu2.xyz

A save editor for **[nfsu2.xyz](https://nfsu2.xyz)**, the browser version of Need for Speed Underground 2. It runs in your browser, so there's nothing to install, and your save never leaves your PC.

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

1. On [nfsu2.xyz](https://nfsu2.xyz), open **Profiles** and click **Download backup**.
2. Open `dist/NFSU2-Save-Editor.html` and drop in your profile from the backup (`NFS Underground 2/<profile>/<profile>`).
3. Make your edits and click **Download edited save**.
4. Put the edited file back in the backup, then click **Restore** on nfsu2.xyz.

Keep your original backup.

## Development

```
npm test        # run tests
npm run build   # rebuild dist/
```

The save format is documented in [docs/SAVE-FORMAT.md](docs/SAVE-FORMAT.md).
