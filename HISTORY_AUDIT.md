# Historical accuracy audit — Bader simulation, HRE c. 1382

Working list for the accuracy pass.

## Landed so far (2026-07-20)

| # | Fix |
|---|-----|
| 5 | "Triage" removed from all player-facing dialogue (EN + DE) |
| 1 | `npc_scribe` → cathedral chapter scribe; no "university" anywhere |
| 10d | `zodiac_libra` → loins/kidneys, `zodiac_scorpio` → groin, per the homo signorum |
| 14, 15 | `Brigitte`/`Sabine` removed; `Klaus`→`Claus`, `Rupert`→`Ruprecht`, `Greta`→`Gret`, `Cäcilie`→`Cecilia`; added `Sebolt`, `Cunz`, `Götz`, `Endres`, `Erhard`, `Elisabeth`, `Dorothea`, `Osanna` |
| 13 | Surnames Franconianised — `Schmid`, `Beck`, `Hafner`, `Schultheiss`; added Nürnberg patrician houses, weighted to noble/merchant patients |
| 16 | `Millbrook` → `Mühlbach` in the English build |
| 4 | `hygiene_clean` no longer targets all four humors — reframed as a miasma *Pestregimen* |
| 7 | Würzburg moved west of Nürnberg (x 700 → 330); Tauber-valley Rothenburg↔Würzburg edge added; map header no longer calls Augsburg Franconian |
| 43 | New **Codex → Sources** page distinguishing what is attested from what is dramatised |

Remaining items below are unstarted. The largest are **#2** (Nürnberg had no
guilds after 1349), **#6** (the *unehrliche Berufe* question, which needs a new
honour axis), and **#11** (currency and price scale).

---

## Already correct — do not "fix"

- `systems/treatment.ts` humoral qualities: blood hot+moist, yellow bile hot+dry,
  phlegm cold+moist, black bile cold+dry. **Exactly right.**
- `data/history.ts` `seasonalHumorBias` — correct Galenic seasonal mapping.
- `en.ts` `lore_church_1163` *prose* is properly hedged (the key *name* is the problem — see T1-9).
- NPC names Berthold, Adelheid, Krafft, Ortlieb, Gregor — genuinely period Franconian.
- Ebrach as a Cistercian house (1127) is a good pick.
- `Brautbad`, `Zahnbrecher`, ash-soap, copper boiler, vinegar dressings, toll bridges,
  market-stall tooth-drawing — all authentic.
- War camp near Augsburg is plausible (Swabian League vs Eberhard of Württemberg, 1376–89).

---

## Tier 1

| # | Problem | Fix |
|---|---|---|
| 1 | **`npc_scribe` = "University scribe" at Würzburg.** No university in Franconia in 1382 (Prague 1348, Vienna 1365 only; Heidelberg 1386 and Cologne 1388 are *after*; Würzburg 1402, failed). | Cathedral-chapter `Domherr`/*Domschule* scribe, or a lay `Wundarzt` under episcopal contract. Never use "university". |
| 2 | **Nürnberg is given guilds.** Nürnberg abolished its Zünfte after the 1348–49 Handwerkeraufstand and had none until 1806. Crafts were *geschworene Handwerke* under the patrician Rat via *Rugsherren*. | Replace guild with *geschworenes Handwerk*/*Rugsherren* in Nürnberg; inspections become a **council** act (`councilFavor`). Keep real Zünfte for Würzburg, Bamberg, Rothenburg, Augsburg — this becomes a real city-to-city distinction. |
| 3 | **`office_council_seat`** — the Innerer Rat was closed to *ratsfähige* patrician families. No craftsman entered it. | Cap at a sworn-craft office (*Rugsherr*, or *Genannter* — needs verification); or relocate council ambition to Rothenburg. |
| 4 | **`hygiene_clean`** — "hygiene"/"empirical" are anachronistic; it targets *all four* humors (nothing in Galenic medicine does); listed as best treatment on ~10 templates incl. burns and childbirth. Germ theory in costume. | Reframe as **miasma**-based `regimen_pestilentiae` per the 1348 Paris consilium / German *Pestschriften*: fumigate with juniper, vinegar-wash, air the room, remove the sick. **No** humor targets (or blackBile only). Restrict to plague/foul-air. |
| 5 | **"Triage"** in player-facing dialogue — Napoleonic term. | "open your doors to all" / "die Stube allen öffnen". Internal flag names are fine. |
| 6 | **`unehrliche Berufe` entirely absent.** Baders were widely *unehrlich*/*anrüchig* — barred from guilds, testimony, office; only declared honourable by the 1548 Reichspolizeiordnung. In 1382 this is the central social fact of the trade. | Add an `honour`/*Ehrlichkeit* axis gating marriage into artisan families, guild entry and office (also resolves #3). **Biggest missing piece.** |
| 7 | **Geography.** Augsburg is Swabia, not Franconia (file header claims Franconia). Würzburg is placed **east** of Nürnberg (`x:700` vs `560`) — it is ~100 km WNW. | Header → "Franconia and the Swabian marches". Würzburg x → ~300–380. Add the missing `rothenburg ↔ wurzburg` Tauber-valley edge (~60 km); Rothenburg↔Augsburg (~140 km) is the less natural link. |
| 8 | **`npc_clergy_surgeon` "Cathedral surgeon"** teaches cupping + scarification — exactly what Lateran IV (1215) c.18 forbade those in major orders, contradicting the game's own church lore. | Make him the chapter's contracted **lay** *Domstiftswundarzt*, or a monastic *infirmarius* teaching herbs only. |
| 9 | **`lore_church_1163` key name** enshrines "Ecclesia abhorret a sanguine" — in no authentic conciliar text; a 19th-c. popularisation. Tours 1163 concerned monks leaving cloisters to study. The real canon is **Lateran IV (1215) c.18**. | Rename `lore_church_surgery`, cite 1215, note the phrase is a later invention and that barbers were already doing the work. |
| 10 | **Zodiac bloodletting model.** (a) `currentZodiac` starts Aries at day 1 — Sun enters Aries ~12–13 March, so it is ~70 days out. (b) Keyed to solar month; the *Laßtafeln* key to the **Moon's** sign (~2.5-day cycle). (c) Doctrine is **body-part specific** (*Aderlaßmännchen*/homo signorum) — game applies a flat penalty and never links sign to vein. (d) `zodiac_libra`/`zodiac_scorpio` glosses are astrological personality, not body parts — Libra rules loins/kidneys, Scorpio genitals/groin. (e) Missing *dies aegyptiaci*/*verworfene Tage* and *goldene Aderlaßtage*. (f) Libra/Virgo bonus has no doctrinal basis I could find — **needs verification**. | Fix the two glosses (cheap). Then model the Aderlaßmännchen properly: vein choice vs moon sign. |
| 11 | **Currency unnamed; prices out by orders of magnitude.** Franconia 1382 = **Pfennig/Heller** (Haller Heller dominant); **Groschen is wrong** (Saxon/Bohemian). A noble shave pays ~21; a Badestube costs 120 — i.e. six shaves buys a bathhouse. | Declare Pfennig; price property in **Gulden** at ~1 fl ≈ 240 Pf (*exact 1382 rate needs verification*, range ~200–260). Rescale property up 1–2 orders of magnitude or fees down. Also: `ui/icons.ts` comment should reference the **Heller** (open hand / cross), not Groschen. |
| 12 | **`cupping` gated as advanced** (`unlockCost 50`, `minHand 3`) — *Schröpfen* was the routine everyday Badestube service, often done by the *Bademagd*. Venesection is given free instead. Also `scarify` and `cupping` are the same procedure split in two (scarification is the first half of wet cupping). | Make `cupping` a starter at `minHand 1–2`; fold `scarify` in as a dry/wet variant. |
| 13 | **Surnames are the modern German top-20 list.** `Schmidt` (→`Schmid`), `Becker` (Rhenish → `Beck`), `Töpfer` (E-Central → `Hafner`), `Richter` (E-Central office name → `Schultheiss`), `Neumann`/`Hoffmann` modern. No actual Nürnberg names. | Swap the four; add attested Nürnberg names — *Stromer, Holzschuher, Tucher, Behaim, Groland, Ebner, Muffel, Haller, Kress, Pfinzing, Volckamer* — weighted to noble/merchant. Keep `Bader`, `Scherer`, `Binder`, `Gerber`, `Seiler`, `Metzger`, `Färber`, `Krämer`, `Maurer`. |
| 14 | **`Brigitte`** — St Birgitta canonised **1391**, after the game's date. **`Sabine`** rare in medieval Germany. `Cäcilie` (modern ä), `Greta` (Scandinavian/modern form; period `Gret`/`Grede`). | Remove Brigitte and Sabine; add `Elisabeth`, `Osanna`, `Dorothea`. Keep Kunigunde, Clara, Katharina, Margarete, Barbara. |
| 15 | **`Klaus`** modern orthography and duplicates `Nikolaus`. `Rupert` is Salzburg form. **`Sebolt`/`Sebald` missing** — Nürnberg's own patron saint. | `Claus`/`Clos`/`Niklas`; `Ruprecht`; add `Sebolt`, `Cunz`, `Götz`, `Endres`, `Erhard`. `Wolfgang` borderline — needs verification. |

## Tier 2

16. `loc_small_village: 'Millbrook village'` — English calque; German build correctly says **Mühlbach**. Use the German toponym in EN too.
17. `title_noble_surgeon`/`Adeliger Chirurg` — no medieval German parallel; *Chirurg* is a learned loanword. → **`Leibarzt`/`Leibwundarzt`** of a lord, the real career ceiling.
18. `office_city_surgeon` → **`Stadtwundarzt`/`Stadtscherer`** (the *Stadtarzt/Physicus* was the university physician, unreachable).
19. `npc_field_barber` → **`Feldscher`**.
20. `npc_merchant_leech` at Augsburg — "leech" is archaic English for *physician* (unintended pun); leeches were gathered by low-status **`Egelfänger`**. Relocate to a village/marsh node. Also he teaches cauterisation, which belongs to a Wundarzt.
21. `cataract_couch` taught by a scribe → itinerant **`Starstecher`** at a market/fair (worked a town and left before outcomes were known).
22. `truss_hernia` taught by a wise woman → travelling **`Bruchschneider`**.
23. `mouth_wash` costs soap but is described as sage-and-salt. → `{ herbs: 1 }`, or add a wine/vinegar item (also useful for wound-washing).
24. Monastery mentors charge coin (Cistercian statutes restricted practising for gain) and Ebrach has a **Sunday** market. → teach for alms/labour; `marketDay: -1`.
25. `melancholy` missing its signature treatment — purging black bile with hellebore. `purge_draught` exists and targets blackBile; list it first.
26. `nosebleed` treated by bleeding is **authentic** (doctrine of *revulsion*/*Ableitung*) but unexplained, so it reads as a bug. Add a flavour line naming it.
27. `venereal_ulcer` — venereal framing is post-1495 (syphilis reached Europe 1494–95). Recast as an ulcer of doubtful cause. **Missing opportunity:** the **`Lepraschau`** (leper examination) was frequently a Bader duty — excellent authentic mechanic. Nürnberg's Heilig-Geist-Spital (1332, Konrad Groß) is unnamed.
28. `midwife_assist` as routine paid work — childbirth was the sworn *Hebamme*'s domain; men excluded except to extract a dead foetus. Make it rare, story-gated, with a folk/church penalty.
29. `complaint_scabies` "itch that crawls under the skin" — mite discovered **1687**. Period explanation: corrupt/salt humor. (The blackBile assignment is correct medieval reasoning; only flavour text needs changing.)
30. "Houses marked with crosses"/"tokens" — chiefly 16th–17th-c. English plague vocabulary. German is *Pestbeulen*/*Drüsen*. **Needs verification** for 14th-c. German practice.
31. Plague backstory undated — Black Death (1348–51) is 30+ years past by 1382. Name a later wave: c. 1356–57, 1360–63 (*Kinderpestilenz*), 1371–75, or the 1380s.
32. `festival_advent: 'Advent market'` — Christkindlesmarkt first documented **1628**; Advent was penitential with restricted trading. Substitute a patronal fair: St Lorenz (10 Aug) or St Sebald (19 Aug).
33. Sunday penalty only `×0.95` — Sunday/feast-day work was *prohibited* by council Feiertagsordnungen. Conversely **Saturday** was *the* bathing day and is unrewarded. Hard-restrict Sunday; add a Saturday surge.
34. `wedding_bath` favours Friday (a fast day, avoided for weddings). Sunday/Monday were usual; Advent and Lent were closed seasons. Brautbad was the **evening before**.
35. `travelCost` is per-node not per-edge, so Augsburg costs 7 from anywhere. Real distances from Nürnberg: Bamberg ~60 km, Rothenburg ~65, Würzburg ~100, Augsburg ~140. Move cost onto edges.
36. Nürnberg had a **permanent daily** Hauptmarkt (laid out 1349) plus annual fairs — it deserves an exception to the one-day-per-town rotation.
37. `cataract_couch` charges no iron tool but requires a *Starnadel*; other tool-using techniques charge `ironTools`.
38. `erysipelas` → assigned `blood`; authorities generally said **yellow bile**/bilious blood. **Needs verification.**
39. `gout` → assigned `yellowBile`; *podagra* was usually a cold phlegmatic defluxion. **Needs verification.**
40. `sweat_bath` targets `blackBile`, but black bile is cold+**dry** and wants moistening. Correct for phlegm. **Needs verification.**
41. `plague_like` assigned `blackBile` — plague was attributed to corrupt air, not a humor (1348 Paris consilium blamed the Saturn–Jupiter–Mars conjunction of 20 March 1345). Reframe; the conjunction is good codex material.
42. `lore_bloodletting` "arm or neck" — arm veins dominate; standard alternatives were **foot** (saphena) and forehead/temple. Jugular uncommon.
43. **`lore_bader_role` collapses four trades.** Never distinguished anywhere: **Bader** (Badestube, tub, Schröpfen, Aderlass, shaving) / **Barbier-Scherer** (shop, shaving + minor surgery) / **Wundarzt** (wound surgeon, often itinerant) / **Arzt-Physicus** (university, does not cut). Add a codex entry; replace "surgeon" with *Wundarzt*.
44. Guild apprenticeship apparatus may be retrojected — rank terms (Lehrling/Geselle/Meister) are correct, but formal *Meisterstück*, mandatory *Wanderjahre* and written Bader statutes are largely 15th–16th c. **Needs verification** per town.
45. Beggars pay cash — they paid nothing, in kind, or were treated as alms. The ethics system already exists to handle it.

---

## Cheapest high-impact fixes, ranked

1. Remove "triage" from dialogue (5) — one line, player-facing.
2. Rename `npc_scribe` away from "university" (1).
3. Fix `zodiac_libra`/`zodiac_scorpio` body parts (10d) — two strings.
4. Delete `Brigitte`; `Klaus`→`Claus`; add `Sebolt` (14, 15).
5. `Millbrook`→`Mühlbach` (16).
6. Reframe `hygiene_clean` as miasma *Pestregimen*, strip four-humor targeting (4).
7. Nürnberg as *geschworenes Handwerk* under the Rat (2) — largest single accuracy gain, and creates real mechanical variety between cities.
8. Move Würzburg west of Nürnberg (7) — one coordinate.

## Best additions (missing rather than wrong)

- **Aderlaßmännchen** as a real mechanic — vein choice against the moon's sign.
- **Lepraschau** as a Bader duty.
