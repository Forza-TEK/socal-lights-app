# Accounts and home decorating contests

**Live on `main` but hidden** (pages unlinked and `noindex`; migration `0109` applied). Sign-in is off until the Google and Resend secrets are set. The interactive sample goes further than the shipped pages: judges, award structures and prizes, season archive, profile, badges, avatars, address autocomplete, notifications and frozen result snapshots exist only in the sample so far. See `docs/voting-standards.md` for the voting review.

## What it does
- **Add hub** (`/add`): choose an event (`/add-event`), a contest (`/add-contest`) or a lighting display (`/add-house`). All three use the step-by-step flow in `public/addflow.js`.
- **Contest wizard** (`/add-contest`): four screens (Basics, Dates, Rules, Review). Signing in happens on the last screen; the draft survives the Google redirect.
- **Contest page** (`/c/<slug>`): the page the QR code opens. Shows the contest, the approved homes, and Vote buttons.
- **Entry form** (`/c/<slug>/enter`): photos, address, name. Needs sign-in. Posts to `/api/submit` with a `contest` field. A home does not pick a category: it competes in every category.
- **Organizer dashboard** (`/c/<slug>/manage`): approve or decline entries, pause/start voting, hide counts, announce winners, copy link, QR poster.
- **Admin** (`/admin/`, Contests tab): approve or decline contests that were held for review.

## How it works
- **Accounts**: one per verified email (lowercase, no `+tag`, no dots for Gmail). Sign in with Google or an emailed 6-digit code; both prove the same email, so both reach the same account. Sessions are a cookie (`scl_session`, 30 days); only a hash is stored.
- **Contest goes live immediately** for every organizer, whatever their email (changed in #243; `functions/api/contests/index.js` sets `live = true`). When the email is a free-mail address or does not match the website given, a note is saved on the contest (`contests.note`) so Admin can look; nothing is held. A contest can still be unpublished or declined in Admin, Contests. Limit: 3 contests per account per day. (Older text here said such contests were held as `pending`; that is no longer true.)
- **Live contests** are listed on the map as an event (`events.id = c-<slug>`). Approved entries are ordinary `posts` rows (with `contest_id`, `category`, `entry_no`, `user_id`), so they appear on the map and in the list like any home.
- **Entries**: an organizer can also add homes herself (see "Organizer-added entries" below). `manual` approval keeps photos under `pending/` until the organizer approves (same promotion as the admin's approve). `auto` stores them under `p/` straight away.
- **Voting is per category**: the organizer defines voting categories (for example Best Overall, Most Creative). Every approved home is listed in every category, and each voter picks one favorite home in each category. `votes` has `UNIQUE(contest_id, user_id, category)`, which is what guarantees one vote per person per category; voting again in a category moves that vote. Nobody can vote for their own home. Voting needs the dates (or the organizer's "Start now") and stops when winners are announced. Winners are the top home in each category. For a single overall winner, use one category.
- **Dates and overrides**: entries and voting follow the dates; the organizer can pause either, or start voting early.

## Fairness rules (migration 0110)
Based on `docs/voting-standards.md`.
- "Best Overall" is an ordinary category. There is no computed overall winner.
- Vote counts are hidden until winners are announced unless the organizer chooses to show them.
- One-win-per-home is optional. Tied homes share the win.
- Throwaway email domains can't sign in with a code. Google sign-in is unaffected.
- Organizer tools: review every vote (burst voters are flagged), void or restore a vote, flag a home to disqualify at close (it stays on the ballot and can't win), download results as CSV.
- Official rules: drafted from `public/rules.js`, editable in the wizard, shown on the contest and entry pages. Entering requires accepting them (`rules=1` on `/api/submit`).
- Announcing writes a frozen snapshot to `contests.results`. The contest page, archive and export read it, never the live votes, and votes and flags are locked afterwards. Every entrant is emailed (winners get a congratulations). Needs `RESEND_API_KEY`.
- Judges (pick or score, trimmed mean at 5+, recusal), prizes per award, the Season | Year archive (`/archive`) and winner badges are live (migration 0116). A winner keeps a crown on every listing they own (entries by account, houses by the email on the form); each person can hide badges entirely or per place (list card, map pop-up, details page) on the profile Badges tab.

## Address suggestions
`GET /api/address?q=` proxies Geoapify (free plan, 3,000 credits a day, no card, "Powered by Geoapify" attribution required). Set the Pages secret `GEOAPIFY_KEY` (sign up at geoapify.com, create a project, copy the API key). Without it the street box is plain text. The entry form asks only after 5+ characters and a pause, and identical queries are cached for a day.

## Turning it on (one-time setup)
Set these as **Cloudflare Pages secrets** (Settings, Variables and Secrets). Never put them in the repo.

| Secret | For |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google" |
| `GEOAPIFY_KEY` | street-address suggestions (optional) |
| `RESEND_API_KEY` (and optional `MAIL_FROM`, default `SoCal Lights <login@socallights.app>`) | emailed sign-in codes |

A method with no secrets is simply hidden from the sign-in sheet (`GET /api/auth/me` reports `methods`).

**Google**: Google Cloud console, APIs and Services. (1) OAuth consent screen: External, app name SoCal Lights, support email, authorized domain `socallights.app`, privacy policy `https://socallights.app/privacy`, scopes `openid`, `email`, `profile` (no verification needed for these), then publish it ("In production"), or only listed test users can sign in. (2) Credentials, Create credentials, OAuth client ID, Web application. Authorized redirect URI: `https://socallights.app/api/auth/google/callback`. Copy the client ID and secret into the two secrets.

**Resend**: create an account, add and verify the domain `socallights.app` (DNS records it shows you), create an API key, and set `RESEND_API_KEY`. Free tier is about 100 emails a day.

**Local development**: put `DEV_AUTH=1` and `ADMIN_DEV_BYPASS=1` in `.dev.vars` (gitignored). The sign-in code is then returned on screen instead of emailed, only on `localhost`. **Never set `DEV_AUTH` as a Pages secret.**

## Past results pages (indexable)
`GET /past` lists every announced, live contest grouped by Season | Year; `GET /past/<slug>` is the permanent results page: winners, then every home that entered with its result per category, awards and disqualifications. Both are server-written (`functions/past/`), built from the frozen snapshot through `functions/_lib/archive.js` (shared with `/api/archive`), show only what the Past results tab already shows publicly, are in `sitemap.xml`, and are edge-cached for an hour. Unknown or unannounced slugs return 404. `/c/*` stays `noindex` and disallowed in `robots.txt` on purpose; `/past` is not blocked.

## Launch checklist
1. Merge to `main`. The `Apply database migrations` workflow applies `0109_accounts_contests.sql` to the live database. It only adds tables and columns, so existing events and houses are untouched.
2. Add the secrets above. Until then email and Google sign-in report "not switched on" and the rest of the site is unaffected.
3. The new pages are **not linked** from the map and are `noindex` (meta tag and `_headers`). To open them up: point the map's Add menu (`openAdd` in `public/app.js`) at `/add`, bump the `?v=` on `app.js` in `public/index.html`, and remove `noindex` from `/c/*` if you want contests found by search.
4. Update the **Effective** date in `public/privacy.html` (the accounts section was added on this branch). Review the wording yourself.
5. App stores: the store text says "Free, no sign-up". Change it to "no sign-up to browse". Google sign-in does not work inside an embedded web view, so the Capacitor apps need the sign-in opened in the system browser before contests are offered there. Apple requires in-app account deletion for any app with accounts; deletion is currently by email (`info@socallights.app`).

## Organizer-added entries (2026-11-05, migration 0162)
For cities that register residents on their own form, spreadsheet or email: the organizer (or a co-organizer) pastes the addresses and the homes go straight onto the ballot, the judges' ballot and the "Visit the homes" routes, with no photo and no resident sign-in. Dashboard, Entries tab, card **Add homes yourself** (collapsed once the contest has entries). The resident flow and the wizard are unchanged.
- **Formats** (one home per line): `Street address, City, ZIP | Name (optional)`. City and ZIP are optional; without a city the contest's city is used. `CA` is ignored. A unit can follow the street (`123 Main St Apt 4`). A column pasted from a spreadsheet, tab-separated cells, and leading `1.` or `-` are accepted. A line must start with a house number. A city that is not in `public/cities.js` is kept as typed (Covina is not listed), and the geocoder decides.
- **Flow**: Check addresses (dry run: green found with the matched address, red not found with the reason, grey already in the contest), tick "These residents agreed to have their address shown on the public map", then Add N homes. Only the found lines are sent. The dashboard sends 25 addresses per request (the free Pages plan allows about 50 subrequests per call, and each home costs one or two lookups).
- **API** `POST /api/contests/<slug>/entries` `{ homes: [{ address, name?, descr? }], confirm: true, dryRun?: true }`. Organizer and staff only (401 signed out, 403 anyone else), same origin, `no-store`. Answer: `found` (dry run), `added`, `failed`, `skipped` (each with `index`, `address`, `reason`). `confirm: true` is required to write (400 otherwise); a dry run needs none because it writes nothing.
- **Rules**: refused with 409 after announce ("Results are locked."); refused with 400 once voting has started (the vote start date has come, or any vote or judge pick exists) and when the contest is not live. Allowed after entries close. Limits: 100 homes per call, 500 added homes per contest, 10 calls an hour per account (a dry run counts; table `entry_add_log`).
- **Lookup**: the same geocoder as `/api/submit` (Census, then OpenStreetMap), centered on the contest's city with the same 30 km rule. A home that is not found, is too far, or cannot be looked up (both geocoders unreachable: "The address lookup isn't answering right now") is returned in `failed` and **not created**; unlike a resident entry it never falls back to the city center, because a wrong pin would send judges to the wrong street. A home with the same normalized number, street and suffix as a non-declined entry in the contest (or earlier in the same paste) is `skipped`. Units are ignored, so two apartments at one address count as one home.
- **What is created**: `status='approved'`, `contest_id`, next `entry_no`, the contest's season and county, title = the name given or `Home at <street>`, description `Entry in <contest>` unless given, `photos=[]`, `show_address=1`, `contact_email=''`, **`user_id=''`** and `added_by` = the organizer's account. With no owner account nobody is blocked by the self-vote or judge-recusal rules (not even the organizer), no email goes out at announce (no entrant to email), and deleting the organizer's account keeps the entries (`added_by` is cleared; `user_id=''` still marks them, which is how the "Added by organizer" tag and the 500 cap are worked out). One line goes in "What the team changed" (`Entries: Added N homes`).
- **Removing a mistake**: the organizer's entries list shows "Remove" on an added home (before announce, while it has no votes); it uses the normal decline.
- **Privacy**: the checkbox is the organizer's statement that the residents agreed to have their address shown on the public map. `public/privacy.html` says so. The site does not collect the residents' consent itself.
- **No-photo entries** show the empty tile everywhere (contest page, ballot, judge ballot, `/past`, Past results tab, organizer list); nothing else changes.

## Known gaps
- Account deletion is self-serve (Profile, Account tab, `DELETE /api/me`): it removes sign-ins, drafts, picture, entries and votes and blanks their email on homes and events. For contests the person runs: **announced** contests stay `live` as a frozen archive (Past results, `/past/<slug>`, winner crowns), with `owner_id`, `contact_email` and `installer_email` cleared, co-organizers removed, and the map event removed (the organization name in `org` stays); **unannounced** contests become `closed`. Entries by other people stay, and so do homes the person added to a contest as its organizer (`posts.added_by` is cleared). An announced contest with no owner renders normally; nobody can manage it (it is locked anyway).
- Account deletion also clears the person's email, name and phone from judge rows (the row and ballot go in unannounced contests; announced contests keep an anonymous placeholder and the scores), quote requests they sent (`contest_leads`, `installer_leads`: details blanked, row kept; the copy an organizer or installer-profile owner holds goes with that owner's deletion), `listing_changes`, `contest_changes`, `event_claims`, `alert_subs`, `contest_staff` rows in other people's contests, `reports.contact` and `installers.owner_email`/`email`. `feature_orders` (financial record) keeps its row with `user_id` cleared; `email_prefs` stays as the unsubscribe record.
- An entrant who deletes their own account loses their live entry, votes and photo, and their entry is scrubbed from the frozen results of announced contests (`contests.results`: name, address, city, coordinates and photos emptied, `removed: true`; rank, vote tallies, judge values and awards stay). Every page that reads the snapshot (`/past`, `/past/<slug>`, `/api/archive`, the contest page, the Past results tab) shows "Entry removed at the entrant's request" with no photo, name, address or city. The home's opaque post id still appears in the award list. The organizer CSV export shows a blank name for such an entry.
- Contest owners are a single account (no staff accounts).
- Facebook and Apple sign-in were considered and dropped.
- Entries do not geocode-check on the contest page; the address is geocoded by `/api/submit` as for any home (falls back to the city center if not found, and the admin can fix the pin).
- Tests ran locally only (`wrangler pages dev`, local D1/R2). Google sign-in and email delivery have not been exercised because they need the secrets above.

## Team change log (2026-11-02)
Everyone who runs a contest (creator and co-organizers) sees "What the team changed" on the dashboard: who changed which setting, from what to what, and when. A banner shows the latest change by someone else. The others on the team are emailed on each change. Logged: edits to the details, the entries/voting/counts switches, Start voting, announcing, sponsors, judges and co-organizers (not individual entry approvals). Table `contest_changes`.
