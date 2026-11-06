# NFSU2 profile format (PC, 54,966 bytes)

These notes come from comparing an early-career save with a 100% save, plus the
save-handling code on nfsu2.xyz. All values are little-endian. Offsets are
absolute unless marked `+n`, which is relative to the start of a block.

## Header

| Offset | Size | Meaning |
|---|---|---|
| 0 | 4 | Magic `20CM` |
| 4 | 4 | File size (54966) |
| 8 | 4 | 8 |
| 12 | 4 | Data size (54930) |
| 16 | 4 | CRC of bytes [28, 36) |
| 20 | 4 | CRC of bytes [36, end) |
| 24 | 4 | CRC of bytes [0, 24) |
| 28 | 4 | Version, 269 (0x10D). Other values are "saved by another version" |
| 32 | 4 | Data size again (54930) |

The CRC is CRC-32 with polynomial 0x04C11DB7, processed MSB-first. The first four
bytes are read big-endian and inverted to seed it, and the result is inverted.
Write the three CRCs in this order: 16, then 20, then 24, because 24 covers 16..24.
nfsu2.xyz flags a profile with bad CRCs as "edited with a save editor" and repairs
them on restore. The editor writes correct CRCs, so no warning appears.

## Car table, 0x24 to 0x4A8

48 records of 24 bytes starting at 36. The first 31 belong to the 31 cars in the
order below. Field `+8` is a float that is 0 until the car is unlocked in the
career. The 100% save has 29 unlocked. Field `+20` is the car index; unused
records hold `0xFFFFFFFF`.

Car order (internal names): PEUGOT, FOCUS, COROLLA, 240SX, MIATA, CIVIC, PEUGOT106,
CORSA, HUMMER, NAVIGATOR, ESCALADE, TIBURON, SENTRA, CELICA, IS300, SUPRA, GOLF, A3,
RSX, ECLIPSE, TT, RX8, 350Z, G35, 3000GT, GTO, MUSTANGGT, SKYLINE, LANCEREVO8, RX7,
IMPREZAWRX.

## Car blocks

| Area | Start | Count × size |
|---|---|---|
| My Cars (Quick Race garage) | 1196 | 20 × 1072 |
| Career garage | 22636 | 5 × 2034 |
| Stock car copies (rivals / showroom) | 32810 | 6 × 1076 |

Common layout (first 1072 bytes):

| `+` | Meaning |
|---|---|
| 0 | Slot ID. Career slots are fixed: 0x319A8CA1 + slot index |
| 4 | Copy of the car's value in the car table |
| 8 | 1 = slot in use |
| 12 | Career: 4 = shown in garage. My Cars: 2 |
| 16 | Career: 1 = has a car |
| 24 | Car model: bin hash of the internal name (for example `bh("SKYLINE")`) |
| 28 to 708 | Visual parts, one u32 part-name hash per slot |
| 704 | `<CAR>_CV` |
| 708 to 748 | 10 performance floats, 0 for stock and about 3.0 when maxed |
| 780 to 856 | 76 performance flags (0/1) |
| 856 to 1061 | Tuning values, 100 = default |

Career blocks add `+1069` = purchased (1), `+1070` = flags, and `+1072..2034` =
a bitfield of bought parts.

`44415` holds the slot ID of the current career car. `50639` holds the ID of the
first used My Cars slot.

### Part hashes

Parts are stored as `bh(name)`, where `bh` starts at 0xFFFFFFFF and does
`h = h * 33 + char` for each character. Known slots:

| `+` | Part name pattern |
|---|---|
| 28 | `<CAR>_BASE` |
| 32 / 36 | `<CAR>_KITnn_FRONT_BUMPER` / `_REAR_BUMPER` (KIT00 = stock; seen up to KIT26) |
| 48 | `<CAR>_KIT00_BODY` |
| 52 | `<CAR>_KITWnn_BODY` (widebody; KITW00 = stock) |
| 56 | roof scoop (generic) |
| 60 | `<CAR>_TOP` |
| 64 | `<CAR>_KIT00_HOOD` or `<CAR>_STYLEnn_HOOD` |
| 68 | `<CAR>_KIT00_TRUNK` |
| 72 | `<CAR>_KITnn_SKIRT` |
| 76 | spoiler (stock `<CAR>_KIT00_SPOILER`, otherwise generic) |
| 80 | `<CAR>_KIT00_ENGINE` or `<CAR>_STYLEnn_ENGINE` |
| 84 / 88 | `<CAR>_KIT00_` or `_STYLEnn_` + `HEADLIGHT` / `BRAKELIGHT` |
| 92 | exhaust |
| 96..116 | `<CAR>_KIT00_` or `_KITWnn_` + `DOOR_LEFT`, `DOOR_RIGHT`, `DOOR_PANEL_LEFT/RIGHT`, `DOOR_SILL_LEFT/RIGHT` |
| 128 / 132 | `<CAR>_KIT00_HOOD_UNDER` / `_TRUNK_UNDER` |
| 136 | brakes: `<CAR>_KIT00_FRONT_BRAKE` or `BRAKE_STYLEnn` |
| 144 / 148 | wheels (front / rear) |
| 156 | `<CAR>_KIT00_WING_MIRROR` |
| 160 | `LICENSE_PLATE_STYLE01` |
| 164 | `<CAR>_KITnn_TRUNK_AUDIO` |
| 236..276 | 11 car-specific slots, names unknown |
| 280 | probably paint (generic) |
| 284..296 | `BODY_nn` and others |
| 336..396 | 4 vinyl layers × 4 colours (`VINYL_Ln_COLORnn`) |
| 640 | window tint (`WINDOW_TINT_STOCK`) |
| 644..656 | neon (`NEON_NONE`) |

A part with a car-specific suffix that has no known name can still be moved to
another car: `bh(CAR + suffix) = bh(CAR) * 33^len(suffix) + bh0(suffix)` (mod 2^32),
where `bh0` is the same hash started at 0. `stockPart()` in `src/core.js` uses this.

## Career and profile

| Offset | Meaning |
|---|---|
| 41322 (0xA16A) | Cash, u32 |
| 39266 to 53780 | Career progress: races, stages, shops, unlocks, stats, records. Not decoded field by field; the editor copies it whole from a 100% save |
| 51023 / 51024 | Save mode bytes (autosave / prompt), as read by nfsu2.xyz |
| 53797 | Profile name, up to 32 bytes, NUL-padded |
| 54061.. | Controller settings (`GDAPFN`, `NFSU2`) |

## Other files in an nfsu2.xyz backup

- `GARAGE.DAT` (`N2GA` header, 5 more empty-looking 2034-byte garage slots) is written
  by the game, not by the website. The editor leaves it alone.
- `gamefile.bin` is multiplayer data (lobby settings, race results).
- `settings.ini` and `registry.txt` are settings for the port and the game.
