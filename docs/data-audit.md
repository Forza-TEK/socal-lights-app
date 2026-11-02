# Data audit and entry rules (2026-11-02)

## What the audit found (public data on the live site, 6 homes and 2,004 events)
| Field | Finding | Fix |
|---|---|---|
| Home phone | 1 of 1 stored as plain digits (`3103569577`) | shows as `(310) 356-9577` everywhere now; stored value tidied by Data check |
| Home street | `25972 Limerick ln` next to `25972 Limerick Lane`, and `835 Loma Vista Street`: three styles | one style: Title Case with short suffixes (`Ln`, `St`) |
| Event price wording | "Price not listed" 204, "Check listing" 94, "Check site" 27, "Not listed" 21: four phrases for the same thing | migration 0144 and a rule in `docs/updating-events.md` (`Price not listed`, `Check listing`) |
| Event web page | 1 `http://` link; the rest `https://`, none with stray spaces | left as is (can't be verified automatically) |
| Event addresses | 3 of 2,004 have no ZIP | left for the sweeps; the validator already warns |
| Event names, hours, addresses | no stray spaces or capital-letter problems | none needed |

Private fields (contact emails, leads, users, alert signups) can't be read from outside. The admin **Data check** tab audits them on the live data (see below).

## Rules (one set, `public/norm.js`, used by the forms and the server)
- **Phone:** a US number with 10 digits, with or without `+1`, spaces, dots, dashes or brackets; area code can't start with 0 or 1; an extension (`x123`) is kept. Saved as `(310) 555-0123`. Invalid: the box shows "Enter a 10-digit phone number, like (310) 555-0123." and the form won't continue; the server refuses it too. Links use `tel:+1...`.
- **Website:** `https://` added when missing, host lowercase, spaces removed; anything else is refused.
- **Email:** trimmed and lowercase.
- **ZIP:** first five digits (ZIP+4 is shortened); fewer than five is refused.
- **Street:** USPS-style short suffixes (`St`, `Ave`, `Dr`, `Ln`, `Blvd`...), directions in capitals, capitals fixed when typed all upper or all lower, trailing period removed.
- **Names (people, businesses, displays, venues, contests):** spaces collapsed; text typed ALL CAPS or all lowercase becomes Title Case (LLC, INC, HOA, OC, DJ stay capitals); mixed-case names are left alone.
- **Radio station:** `88.1fm` becomes `88.1 FM`.
- **Short text (hours, tips, price, service area):** spaces collapsed. Longer text keeps its line breaks and loses stray spaces.

## Where it applies
- **As people type (every form, `public/norm-ui.js`):** tidied when they leave the box, so the next screen, the review screen and the saved record all show the clean text. Applies to the add event, add home, add contest, contest entry, profile, installer manage, quote, contest edit, sponsor, report and admin edit forms, because it recognizes the box by its type, name or label.
- **On the server (before saving):** home and installer posts, contest entries, events, contest create and edit, the profile, edits to your own homes and events, installer profile edits (owner and admin), both quote forms, problem reports and admin edits of homes.
- **When shown:** phones are formatted everywhere they appear, even older entries stored as digits. The "Quotes" label on installer pages is now **Call for Quotes**.

## Cleaning up older records
Admin > **Data check**: "Check" lists every value that would change (with examples) and every value that needs a person (a 7-digit phone, a broken web address). "Tidy" applies the changes. It touches posts, installers, contests, submitted events, users, alert signups and quote leads, never changes a value that is already tidy (running it twice changes nothing), and leaves anything it can't fix as it is.

Event data from the sweeps is not changed by Data check; sweeps follow `docs/updating-events.md`, including the price wording above.
