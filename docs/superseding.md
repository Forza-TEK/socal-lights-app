# A person's own record replaces the sweep-made one

Installers and homeowners add their displays through the Add form. The sweeps may already have made an automatic record for the same house. So visitors see one entry, the person's own record replaces the sweep record.

**Rule**
- Once an **approved** house or installer post has the same street address as a sweep-made event, that event is hidden on the map and in the list. The post stays exactly as the person wrote it (nothing is copied across).
- Same address = same street number, street name and city **or** ZIP. Written differently ("Street" vs "St", "North" vs "N", "Apt 4") still matches. Intersections never match.
- Same street, **different number** is not a match. Both stay listed, and the admin sees the near miss.
- Contest entries do not replace anything, only plain house and installer posts.
- Nothing is deleted or changed in the database. The match is worked out each time the map loads (`functions/api/events.js`, `functions/_lib/addrkey.js`), so a sweep that adds a record at an address that already has a post is covered too, and **declining or unpublishing the post, or deleting the account, brings the sweep record back by itself.**

**Admin**
- A house waiting for review shows "Replaces a sweep record: …" (and any same-street near misses) before you approve.
- **Replaced records** tab: every address that has both a sweep record and a person's post, plus the near misses. For each one you choose what visitors see:
  - **Their record** (the default, the rule above): the sweep record is hidden.
  - **Both**: both records show.
  - **Sweep record**: the sweep record shows and the person's post is hidden from the map. The post stays approved and the person is not told; switch back at any time.
  Stored in `events.keep_listed` (migration `0128`): 0 = their record, 1 = both, 2 = sweep record. Each change is written to the Activity log. A post hidden this way is marked "Not on the map" in Published houses.
- The Events tab and its count still include hidden sweep records, so they can be edited. The public map shows `/api/events`; the admin uses `/api/events?all=1`.
- The tab counts (Waiting for review, Published houses, Submitted events, Contests, Events, Replaced records, Users) come from `/api/admin/counts`.

## Contest wins carry over (rule)
When a person's record replaces a sweep record (choice **Their record**), a contest win stated on the sweep record is shown on the person's listing as a yellow crown line, so the win is not lost.
- **Where:** the crown chip on the list card, the map pop-up sub-line, and a crown line with a "Source" link on the details page (the same crown as the platform contest badges).
- **What it says:** the first sentence of the sweep record's description when it states a win in a contest ("Won 1st Place Townhomes/Condos in the 2026 Ladera Ranch (LARCS) Halloween Home Decorating Contest"), or the contest note in its title (for example "OTPA Halloween contest winner"). Wins and honorable mentions count; a costume contest or a plain mention of a contest does not.
- **Display only:** the person's own name, description and photos are never changed or copied into. Up to three wins, no duplicates.
- **Only while it applies:** with **Both**, the sweep record shows its own win, so nothing is added. With **Sweep record**, the person's post is hidden. Back to **Their record** and the win returns. If the sweep record is later removed, so is the line.
- **Admin:** the Replaced records tab shows "Win shown on their listing: ..." under each person's record.
- Code: `functions/_lib/wins.js`, `functions/api/posts.js` (field `b`, entries with `t` and `u`), `public/app.js` (`bChip`, `bPop`, `bLines`).

