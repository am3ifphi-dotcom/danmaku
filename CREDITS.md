# CREDITS / Asset list

This file mirrors the CREDITS list shown in the game's credits screen (`src/game.js`).
Only assets that are actually in this repository are listed. Licenses are stated as they were
checked. Anything not checked is marked as such.

## Sprites (pixel art)

| Asset in repo | Source pack | Author | License | Where it comes from | Check status |
|---|---|---|---|---|---|
| `assets/sprites/player/*` (Captain Clown Nose) | Treasure Hunters — Captain Clown Nose | Pixel Frog (pixelfrog-assets.itch.io) | CC0 1.0 | https://pixelfrog-assets.itch.io/treasure-hunters (mirror: https://github.com/PixelRubro/Pixel-Art-Prototyping-CC0-Collection) | Author page checked; frames pixel-matched to the PixelRubro mirror |
| `assets/sprites/crabby/*` | Treasure Hunters — The Crusty Crew | Pixel Frog | CC0 1.0 | same as above | same as above |
| `assets/sprites/seashell/*`, `cannon/*`, `totem1..3/*` | Treasure Hunters — Shooter Traps | Pixel Frog | CC0 1.0 | same as above | same as above |
| `assets/sprites/coin/*`, `diamond_red/*`, `diamond_blue/*` | Treasure Hunters — Pirate Treasure | Pixel Frog | CC0 1.0 | same as above | same as above |
| `assets/sprites/dust/*`, `crabby_attack_fx/*` | Treasure Hunters — Captain Clown Nose / Crusty Crew | Pixel Frog | CC0 1.0 | same as above | same as above |
| `assets/sprites/cloud_bg/*` | Treasure Hunters — Palm Tree Island | Pixel Frog | CC0 1.0 | same as above | same as above |

Notes
- The sprites were copied from the PixelRubro/Pixel-Art-Prototyping-CC0-Collection repository (CC0 1.0 per its LICENSE file, copied to `assets/sprites/LICENSE-PixelRubro-CC0.txt`). Each copied frame was compared pixel-for-pixel with the source PNG in that repository. The sprite provenance was therefore checked against the mirror, not against the itch.io download.
- The original Pixel Frog download was not separately downloaded in this environment.
- `assets/sprites/manifest.json` maps each animation key to its frame files.

## Font

| Asset | Author | License | Source | Check status |
|---|---|---|---|---|
| DotGothic16 (Latin + Japanese subset, `assets/fonts/dotgothic16/`) | fontworks / Google Fonts | SIL Open Font License 1.1 | `@fontsource/dotgothic16` 5.3.1 on npm | `LICENSE-OFL.txt` copied from the package and kept in the repo |

## Code / sound

| Asset | Author | License | Source | Check status |
|---|---|---|---|---|
| ZzFX (`vendor/zzfx/ZzFX.js`) | Frank Force | MIT | npm `zzfx` 1.4.0 | `LICENSE` in `vendor/zzfx/` |

Sound effects and music are synthesized in code with ZzFX from parameter lists in `src/audio.js`. No recorded audio is used.

## Procedural art

Orbs, diamonds, bands, lasers, safe-zone circles and banners are drawn in code by this project. They are not copied from any external source.

## Not used (checked, then discarded)

- Kenney Pixel Shmup, Kenney Space Kit, Kenney Hexagon Pack: reference images only. Nothing from them is in the repo.
- greatdocbrown "Coins & Gems & Chests" and "Gamepad UI": looked at as candidates. The coin in the game turned out to be Pixel Frog's Gold Coin. Nothing from greatdocbrown is in the repo, so no greatdocbrown credit applies.
- @openfonts/dotgothic16_japanese (MIT), @fontsource/geist-pixel (OFL), @zzfx-studio/zzfxm (MIT), jinglescript (MIT): candidates only, not in the repo.

## Non-commercial use

The project is for non-commercial use. Every asset above is CC0, OFL or MIT, so no extra NC conditions apply.
