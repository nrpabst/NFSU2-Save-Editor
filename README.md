# NFSU2 Save Editor

A save editor for **Need for Speed Underground 2** that runs in your browser. Nothing to install, and your save never leaves your PC.

## Features

- Set your cash
- Unlock 100% career progress, keeping your own cars
- Add, swap or remove garage cars, including 12 fully modded builds
- Max out performance in one click
- Body kits, widebodies, hoods, lights and more
- Quick Race garage editing
- Writes valid checksums, so edited saves load cleanly

## Usage

1. Open `dist/NFSU2-Save-Editor.html`.
2. Drop in your profile (`NFS Underground 2/<profile>/<profile>`).
3. Make your edits and click **Download edited save**.
4. Put it back in your save folder, or restore it on [nfsu2.xyz](https://nfsu2.xyz).

Back up your save first.

## Development

```
npm test        # run tests
npm run build   # rebuild dist/
```

The save format is documented in [docs/SAVE-FORMAT.md](docs/SAVE-FORMAT.md).
