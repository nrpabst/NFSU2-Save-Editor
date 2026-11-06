# NFSU2 Save Trainer

A single-page save editor for Need for Speed Underground 2 profiles. It's built for
backups from the nfsu2.xyz browser port, and it works on the standard PC profile
format. It runs entirely in the browser, so no install is needed and files never
leave your computer.

## Features

- **Bank:** set any cash amount.
- **Career progress:** copy a finished (100%) career into your profile, keeping
  your cars, cash, name and settings.
- **Career garage (5 slots):** add any of the 31 cars, stock or as one of 12 fully
  modded builds. You can also swap models, remove cars and pick the current car.
- **Performance:** maxed or stock with one click.
- **Body parts:** bumper and skirt kits, widebody kits, hood, headlights,
  brakelights, engine, trunk audio and brakes. There's also a full part table where
  you can set any part by name or hash.
- **My Cars (Quick Race garage, 20 slots):** copy career cars in, or add stock or
  modded cars.
- Writes correct profile checksums, so the port doesn't flag the save as edited.

## Using it

1. Open `dist/NFSU2-Save-Trainer.html` in any browser.
2. Drop in your profile file: `NFS Underground 2/<profile>/<profile>` from a
   nfsu2.xyz **Download backup**.
3. Make your changes and click **Download edited save**.
4. Put the file back where it came from in the backup, then **Restore** it on
   nfsu2.xyz.

Keep your original backup. Not every kit or style number exists for every car, and
a part the game doesn't have can crash it when it loads the car.

## Development

You need Node 18 or newer. There are no dependencies.

```
npm test          # runs tests/test.js against the saves in tests/fixtures
npm run build     # inlines src/data.js + src/core.js into src/ui.html -> dist/
npm run data      # regenerates src/data.js from tests/fixtures/100pct.bin
```

- `src/core.js`: save logic, with no DOM (hashes, offsets, car and part builders,
  checksums).
- `src/data.js`: generated data from a 100% save (modded car presets, maxed
  performance, career progress block, car unlocks, part values seen on 2+ cars).
- `src/ui.html`: the page. The build replaces its `/*__CORE__*/` marker.
- `docs/SAVE-FORMAT.md`: everything known about the file layout.

## Fixtures and credits

- `tests/fixtures/early-career.bin` is an early-career profile ("neuneu").
- `tests/fixtures/100pct.bin` is a 100% save found online, and `src/data.js` is
  built from it. Check where it came from before publishing this repo.
- The basic layout of the car slots builds on
  [MemphisRider_NFSU2](https://github.com/AJLethal/MemphisRider_NFSU2) by AJLethal.
