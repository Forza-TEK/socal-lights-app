# Admin parity: Admins can do everything users can do

Owner request 2026-11-13: an Admin must be able to do, in the back end, anything a signed-in user can do, in case it is ever necessary.

## How it works
- Admin pages that show a person's or organizer's item now have links such as **Open their profile as them**, **Edit as owner**, **Organizer dashboard (as the organizer)** and **manage as owner**. They open `/admin/as?to=<page>&as=<email or id>`.
- `functions/admin/as.js` checks the Cloudflare Access login (same check as every admin page), fetches the normal page (`/profile`, `/contests`, `/add-event`, `/add-house`, `/add-contest`, `/c/<slug>/manage`, `/installer/<slug>/manage`) and adds `public/admin/as-shim.js`.
- The shim sends the page's `/api/...` calls to `/api/admin/as/...`. That route (`functions/api/admin/as/[[path]].js`) verifies the Admin, finds the owner, signs a 5-minute header (`x-admin-act-as`, `functions/_lib/actas.js`) and runs the **same handler** the user would run. So every user action works with the same rules, and nothing was copied.
- A red **Admin view** bar shows on those pages.
- Every call is written to the Admin log: area `as`, action `act`, id `METHOD path`, label `as <email>`.

## Left out on purpose
Voting, the judges' ballot, checkout and payment, and sign in/out. Admin should not cast votes, take a judge's seat or pay as someone else. Admin keeps its own tools for everything else (edit or delete events, homes, contests, entries, users).

## Owner step
In Cloudflare Pages settings add the secret `ADMIN_AS_SECRET` (any long random string). If it is missing the feature uses `THROTTLE_SALT`; if neither exists the route answers 503 and the links do nothing.

## Not built
An Admin button to remove a single owner photo from an event (use "Edit as owner", then remove).

Test: `tests/admin-as.test.mjs`.
