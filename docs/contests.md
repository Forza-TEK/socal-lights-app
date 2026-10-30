# Accounts and home decorating contests

Built on the branch `claude/amazing-thompson-wfxqst`. **Not merged to `main` yet**, so none of this is on the live site.

## What it does
- **Add hub** (`/add`): choose an event (`/add-event`), a home decorating contest (`/add-contest`) or a lighting display (`/add-house`). The two existing forms are unchanged.
- **Contest wizard** (`/add-contest`): four screens (Basics, Dates, Rules, Review). Signing in happens on the last screen; the draft survives the Google redirect.
- **Contest page** (`/c/<slug>`): the page the QR code opens. Shows the contest, the approved homes, and Vote buttons.
- **Entry form** (`/c/<slug>/enter`): photos, address, name. Needs sign-in. Posts to `/api/submit` with a `contest` field. A home does not pick a category: it competes in every category.
- **Organizer dashboard** (`/c/<slug>/manage`): approve or decline entries, pause/start voting, hide counts, announce winners, copy link, QR poster.
- **Admin** (`/admin/`, Contests tab): approve or decline contests that were held for review.

## How it works
- **Accounts**: one per verified email (lowercase, no `+tag`, no dots for Gmail). Sign in with Google or an emailed 6-digit code; both prove the same email, so both reach the same account. Sessions are a cookie (`scl_session`, 30 days); only a hash is stored.
- **Contest goes live** when the organizer's email domain matches the website they entered. A free-mail address (Gmail, Hotmail, ...) or a mismatch holds it as `pending` for the admin. The link and QR work meanwhile, but the contest is not public and entries are paused.
- **Live contests** are listed on the map as an event (`events.id = c-<slug>`). Approved entries are ordinary `posts` rows (with `contest_id`, `category`, `entry_no`, `user_id`), so they appear on the map and in the list like any home.
- **Entries**: `manual` approval keeps photos under `pending/` until the organizer approves (same promotion as the admin's approve). `auto` stores them under `p/` straight away.
- **Voting is per category**: the organizer defines voting categories (for example Best Overall, Most Creative). Every approved home is listed in every category, and each voter picks one favorite home in each category. `votes` has `UNIQUE(contest_id, user_id, category)`, which is what guarantees one vote per person per category; voting again in a category moves that vote. Nobody can vote for their own home. Voting needs the dates (or the organizer's "Start now") and stops when winners are announced. Winners are the top home in each category. For a single overall winner, use one category.
- **Dates and overrides**: entries and voting follow the dates; the organizer can pause either, or start voting early.

## Turning it on (one-time setup)
Set these as **Cloudflare Pages secrets** (Settings, Variables and Secrets). Never put them in the repo.

| Secret | For |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google" |
| `RESEND_API_KEY` (and optional `MAIL_FROM`, default `SoCal Lights <login@socallights.app>`) | emailed sign-in codes |

A method with no secrets is simply hidden from the sign-in sheet (`GET /api/auth/me` reports `methods`).

**Google**: Google Cloud console, APIs and Services. (1) OAuth consent screen: External, app name SoCal Lights, support email, authorized domain `socallights.app`, privacy policy `https://socallights.app/privacy`, scopes `openid`, `email`, `profile` (no verification needed for these), then publish it ("In production"), or only listed test users can sign in. (2) Credentials, Create credentials, OAuth client ID, Web application. Authorized redirect URI: `https://socallights.app/api/auth/google/callback`. Copy the client ID and secret into the two secrets.

**Resend**: create an account, add and verify the domain `socallights.app` (DNS records it shows you), create an API key, and set `RESEND_API_KEY`. Free tier is about 100 emails a day.

**Local development**: put `DEV_AUTH=1` and `ADMIN_DEV_BYPASS=1` in `.dev.vars` (gitignored). The sign-in code is then returned on screen instead of emailed, only on `localhost`. **Never set `DEV_AUTH` as a Pages secret.**

## Launch checklist
1. Merge to `main`. The `Apply database migrations` workflow applies `0109_accounts_contests.sql` to the live database. It only adds tables and columns, so existing events and houses are untouched.
2. Add the secrets above. Until then email and Google sign-in report "not switched on" and the rest of the site is unaffected.
3. The new pages are **not linked** from the map and are `noindex` (meta tag and `_headers`). To open them up: point the map's Add menu (`openAdd` in `public/app.js`) at `/add`, bump the `?v=` on `app.js` in `public/index.html`, and remove `noindex` from `/c/*` if you want contests found by search.
4. Update the **Effective** date in `public/privacy.html` (the accounts section was added on this branch). Review the wording yourself.
5. App stores: the store text says "Free, no sign-up". Change it to "no sign-up to browse". Google sign-in does not work inside an embedded web view, so the Capacitor apps need the sign-in opened in the system browser before contests are offered there. Apple requires in-app account deletion for any app with accounts; deletion is currently by email (`info@socallights.app`).

## Known gaps
- No self-serve account deletion yet.
- Contest owners are a single account (no staff accounts).
- Facebook and Apple sign-in were considered and dropped.
- Entries do not geocode-check on the contest page; the address is geocoded by `/api/submit` as for any home (falls back to the city center if not found, and the admin can fix the pin).
- Tests ran locally only (`wrangler pages dev`, local D1/R2). Google sign-in and email delivery have not been exercised because they need the secrets above.
