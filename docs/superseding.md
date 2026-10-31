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
- **Replaced records** tab: every replaced sweep record and the post that replaced it, plus the near misses. "Show the sweep record anyway" sets `events.keep_listed = 1` (migration `0128_events_keep_listed.sql`) for a wrong match; "Replace again" undoes it. Both are written to the Activity log.
- The Events tab and its count still include hidden sweep records, so they can be edited. The public map shows `/api/events`; the admin uses `/api/events?all=1`.
- The tab counts (Waiting for review, Published houses, Submitted events, Contests, Events, Replaced records, Users) come from `/api/admin/counts`.
