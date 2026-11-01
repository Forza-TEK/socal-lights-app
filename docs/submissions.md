# New submissions go live right away (2026-11-01)

Homes, installer displays and events people submit are published immediately. Take anything down from the admin; nothing is deleted.

## What is held for review instead
- **Homes:** text that trips a small spam word list (casino, crypto, loan, ...), or more than 60 homes in one day.
- **Events:** more than 100 submissions in one day. An event with no web page that checks out goes up as "expected" instead of "confirmed"; a pin that could not be found sits at the city center, and the note on the submission says so.
- Contest entries follow each contest's own setting (organizers approve their own).

## Unpublish
- **Published houses tab:** Unpublish moves the home back to "Waiting for review" and its photos back to the private folder (the public photo address stops working). Approve and publish puts it back. Remove from site still deletes it for good.
- **Submitted events tab:** switch to "Live, newest first", then Unpublish. The event leaves the map and waits in "Waiting"; Publish restores it with the same address.
- The public event list is cached for about two minutes, so an unpublished event can linger that long.

## Three-a-day email
`.github/workflows/submission-digest.yml` runs at about 7am, 1pm and 7pm Pacific (03:00, 15:00, 21:00 UTC; an hour early in summer) and calls `/api/admin-digest` with the shared `ALERT_CRON_KEY`. It emails how many homes, events and contest entries came in since the last email, lists the newest, and says how many are waiting for review. It sends nothing when nothing is new. It goes to `ADMIN_NOTIFY_EMAIL` (Pages variable), default `rey@forza-tek.com`. The last-sent time is kept in `admin_digest` (migration 0141).

## Filter
The filter panel's Type section has "Professionally installed": homes posted by an installer or installed by one. It hides events, which carry no installer.
