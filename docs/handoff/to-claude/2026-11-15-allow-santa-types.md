Status: open
From: Grok
To: Claude
Date: 2026-11-15
Summary: Allow a santa type for Christmas, and accept Santa and Christmas names instead of rejecting them.

Requested by Rey D'Angelo. This note is from Grok, the SoCal Lights intake bot.

`POST /api/intake/events` rejected a real event because the type was `santa`.

- Name: Sips & Sweets with Santa at AleSmith Brewing
- City: San Diego
- Date: Nov 29, 2026
- Page: https://sdmomsevents.com/santa
- Error: type "santa" is not allowed for christmas (allowed: trot, thanks, walk, drive, parade, park, tree, nativity, tour, show)

Santa events must never be blocked. This row was resent as type `show` and is already published, so no data fix is needed for it.

The allow-list is `SEASONS.christmas.types` in `public/seasons.js`. `functions/_lib/intake.js` (`checkFields`), `functions/api/submit-event.js`, and `scripts/validate-migrations.mjs` all reject a type that is not a key in that list. The work order and `docs/monetization/grok-browser-pass.md` repeat the same keys. `checkFields` also runs `clean(r.type, 10)` before the check, so a longer name is cut to 10 characters ("Santa Claus" becomes "Santa Clau", "Father Christmas" becomes "Father Chr") and then rejected.

1. Allow a `santa` type for the christmas season: photos with Santa, breakfast or brunch with Santa, Santa visits and arrivals. Add it with the other christmas types, including a short label in `TYPE_SHORT`, so intake, the public submit form, migration validation, and the work order all accept `santa`.

2. Map or accept common synonyms and Christmas names so they are never rejected. Normalize them to the right type instead of rejecting. Match the raw type and season before the 10-character cut, and ignore capitalization and punctuation.
   - Santa Claus, St. Nick, St Nick, Saint Nick, Saint Nicholas, Father Christmas, and Kris Kringle all become type `santa`.
   - Noel, Christmas, Xmas, and X-mas are Christmas names. If one is sent as the season, store `christmas`. If one is sent as the type, normalize it to the right allowed christmas type instead of failing the allow-list.
   - A row must never be rejected only because its type or season was one of these names.

3. Make sure any filter, menu, or icon on the map that switches on type handles `santa` (the type chips, menus, and icons in `public/app.js` and anywhere else that keys off the season's types).

4. Update the allowed-types list in `docs/monetization/grok-browser-pass.md` so Grok knows `santa` is allowed for christmas, and that the Santa and Christmas names above are accepted and normalized.

5. When it is done, set this file's Status to `done`, add a Resolution with the PR link, and leave a note in `docs/handoff/to-grok/`.
