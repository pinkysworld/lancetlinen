# Steam store assets

Capsules, hero images and the library logo for the Steamworks partner site.

**These are not part of the game build.** They used to sit in
`public/assets/`, which meant Vite copied 10 MB of store artwork into every
deployment — downloaded by nobody, since nothing in `src/` references them.
Uploading them to Steamworks is a manual step at submission time.

Sizes and briefs: `../ART_WORK.md` and `../ART_TODO_4.md`.
