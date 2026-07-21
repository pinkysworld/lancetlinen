# Audio credits and licences

Every recording shipped with this game is **CC0 1.0 Universal** — a public
domain dedication. That is the only licence category that is unambiguously
safe for a paid release without further obligation:

- **CC0** — no conditions at all. Attribution is courtesy, not a requirement.
- **CC-BY** would also be usable, but only with attribution *maintained*, which
  is a standing obligation across every build and store page.
- **CC-BY-NC** is **not usable here** at all. The game is intended for sale.
- "Royalty free" on a stock site usually means *paid licence*, not free. It is
  not a Creative Commons term and has been avoided.

Attribution below is given because the composers deserve it, not because the
licence compels it.

## Music

| In game | File | Title | Composer | Source | Licence |
|---|---|---|---|---|---|
| Main menu, character creation | `mus_menu.mp3` | Medieval: The Bard's Tale | RandomMind | [OpenGameArt](https://opengameart.org/content/medieval-the-bards-tale) | CC0 |
| Market, festival day | `mus_market.mp3` | Medieval: Market Day (loop) | RandomMind | [OpenGameArt](https://opengameart.org/content/medieval-market-day) | CC0 |
| The road, arrival | `mus_road.mp3` | Medieval: Exploration | RandomMind | [OpenGameArt](https://opengameart.org/content/medieval-exploration) | CC0 |
| Bathhouse, treatment, family | `mus_bath.mp3` | Medieval: Harvest Season | RandomMind | [OpenGameArt](https://opengameart.org/content/medieval-harvest-season) | CC0 |
| Endings | `mus_festival.mp3` | Medieval: Minstrel Dance | RandomMind | [OpenGameArt](https://opengameart.org/content/medieval-minstrel-dance) | CC0 |
| Monastery, council | `mus_chant.mp3` | Breves dies hominis | Magdalen Kadel | [OpenGameArt](https://opengameart.org/content/breves-dies-hominis) | CC0 |

**`mus_chant` is the one piece that is genuinely of the period** rather than
written to evoke it: a vocal setting of a twelfth–thirteenth century
composition, originally from Wikimedia Commons and released to the public
domain by the performer. It carries the monastery and the graver political
scenes.

All files were transcoded to MP3 at 112 kbps. MP3 rather than OGG/Opus because
Safari on iOS is unreliable with Opus in an OGG container, and the game is
tested there.

## Sound effects and the remaining score

Still synthesised at runtime through the Web Audio API — see
`src/game/audio/AudioManager.ts`. No sampled audio is used for these.

The procedural engine is **not** dead code. Contexts with no recording fall
through to it, and two are left synthetic on purpose:

- `dialogue` — a sparse drone under text the player is reading is exactly
  right, and a recorded piece would compete with the writing.
- `tense`, `night`, `war` — the phrygian and aeolian themes in
  `src/game/audio/themes.ts` do this better than any CC0 recording found.

## If you add a track

1. Verify the licence **on the source page**, not from a search result or a
   list. Screenshot it if the site is one that can change terms.
2. CC0 or CC-BY only. Never CC-BY-NC, never "royalty free" without reading
   what the seller actually grants.
3. Record it in the table above with the direct source URL.
4. Register it in `src/game/audio/tracks.ts`; nothing else needs changing.
