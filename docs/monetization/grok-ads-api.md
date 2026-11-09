# SoCal Lights ads API (hand this whole file to Grok)

_Self-contained. Written 2026-11-09. Base URL `https://socallights.app`. Companion: `docs/marketing/ads-launch-handoff.md` (what to build in Meta Ads Manager) and `docs/marketing/ads-plan-2026-11.md` (the plan)._

## What this is
You create the **Facebook and Instagram (Meta) ads** in Meta Ads Manager. This API lets you **read the approved ads from the site** (copy, links, budgets, dates, picture and video files) and **report status back** (draft, in review, active, paused, disapproved, ended, with spend, impressions and clicks) so the owner sees it in Admin > Ads. You get no database access. The app never touches Meta and never spends anything: **you build the ads and the owner approves anything that costs money.**

## Hard rules (follow every one)
1. **Meta only** (Facebook and Instagram). Nothing in Google Ads, Nextdoor or anywhere else.
2. **Budget: $300 total. $280 is loaded across the five campaigns; $20 is a reserve that is never loaded. Set the Meta account spending limit to $280.** Every ad ends by **Dec 8, 2026** (Pacific Time). County targeting only.
3. **Never create or change a budget, payment method, card or spending limit without the owner.** Stop and ask before every Publish, Submit for review, Confirm or Turn on, and show the owner the campaign summary (name, budget, dates, daily cap, audience, ads) first. Do not enter passwords, 2-factor codes or card numbers.
4. Use **only** the ads in `GET /api/ads/brief`, word for word. No new copy, claims, prices or images. Say "home", never "house" or "display". Do not edit the landing links (they carry the tracking codes). Do not run anything not in the brief (for example ct-c, ev-c, in-c, ho-c, fa-d, fa-e are not in the launch).
5. If an ad is **disapproved**, or an identity check or policy flag appears, stop, tell the owner and report it with status `disapproved` and Meta's wording as the reason.
6. **Report every 2 days** (and right after any status change you want the owner to know about). The admin tab alerts the owner after 48 hours of silence.
7. Reports hold **counts and status only**. Never send names, emails, comments, audience details or anything about a person. The API rejects unknown fields on purpose.

## Authentication, the User-Agent, and errors
Every call needs:
```
Authorization: Bearer <ADS_API_KEY>
User-Agent: SoCalLights-Grok-Ads/1.0
```
- **Always send a custom `User-Agent`.** Cloudflare's Browser Integrity Check has blocked the default Python-urllib agent before (it answers `403` with an HTML page, not JSON). A `403` with HTML means your User-Agent was blocked: set the header above (or `curl`'s own agent) and retry. Do not try to get around it any other way, and tell the owner if it persists.
- The key lives in your secret store as `ADS_API_KEY`. Never paste it in a chat, a file or a message.
- `401` wrong or missing key. `503` the API is not switched on yet (the owner has not created the secret) or a temporary database problem: wait and retry later. `405` wrong method. `429` more than 60 calls a minute for the key: wait 30 seconds (see `Retry-After`). `400` validation failure (the body lists every problem).
- Errors are JSON: `{ "ok": false, "error": "...", "errors": [ ... ] }`.

## Endpoints

### `GET /api/ads/brief`
The approved ads (the launch set only), the campaigns with budgets and dates, targeting, rules, and the file URLs.
```sh
curl -s https://socallights.app/api/ads/brief -H "Authorization: Bearer $ADS_API_KEY" -H "User-Agent: SoCalLights-Grok-Ads/1.0"
```
```json
{
  "ok": true,
  "budget": { "total_cents": 30000, "loaded_cents": 28000, "reserve_cents": 2000, "meta_account_limit_cents": 28000, "all_ads_end": "2026-12-08", "timezone": "America/Los_Angeles" },
  "targeting": { "type": "county only", "counties": ["Los Angeles", "Orange", "San Diego", "Riverside", "San Bernardino", "Ventura", "Santa Barbara"] },
  "rules": ["..."],
  "campaigns": [ { "audience": "contest_organizers", "name": "Contest organizers (Facebook and Instagram)", "budget_cents": 5500, "starts": "2026-11-12", "ends": "2026-12-08", "wave": 1, "daily_hint_cents": 204, "ad_ids": ["ct-a-meta", "ct-b-meta"] } ],
  "ads": [ { "ad_id": "ct-a-meta", "campaign": "contest_organizers", "wave": 1, "headline": "...", "primary_text": "...", "description": "...", "cta": "Learn more", "landing_url": "https://socallights.app/add-contest?ref=mt-ct-a&utm_source=meta&...", "ref": "mt-ct-a", "visual": "...", "asset_id": "a03-contest-screens", "assets": [ { "url": "https://socallights.app/ad-assets/...", "sha256": "...", "bytes": 217581, "content_type": "image/png" } ], "starts": "2026-11-12", "ends": "2026-12-08" } ]
}
```
Budgets (all lifetime budgets with an end date; the daily figure is only to check pace): contest organizers **$55** Nov 12 to Dec 8; event holders **$45** Nov 12 to Dec 1; installers **$20** Nov 12 to Nov 23; families **$100** Nov 24 to Dec 8; homeowners **$60** Nov 24 to Dec 8. Total $280. Wave 1 (contest organizers, event holders, installers) is submitted for review by Nov 9 and starts Nov 12; wave 2 (families, homeowners) starts Nov 24.

### `GET /api/ads/assets`
The pictures and videos, with absolute URLs, `sha256`, size, and the ad ids that use each file. Download each file, check the `sha256`, and upload it to Meta. Use only these files.
```json
{ "ok": true, "count": 13, "files": [ { "asset_id": "a03-contest-screens", "url": "https://socallights.app/ad-assets/a03-contest-screens/....png", "sha256": "...", "bytes": 217581, "width": 1080, "height": 1350, "ratio": "4:5", "ad_ids": ["ct-a-meta"] } ],
  "ads_missing_files": [ { "ad_id": "fa-a-meta", "asset_id": "a08-find-location-video" } ], "ads_without_asset": ["ho-a-meta"] }
```
`ads_missing_files` and `ads_without_asset` list approved ads whose picture or video is not on the site yet: tell the owner, do not make your own.

### `POST /api/ads/report`
Send the latest numbers per ad. **Lifetime** spend so far (not today's), in whole cents. 1 to 100 rows per call. All rows are checked first; if any row is wrong **nothing** is stored and you get `400` with every problem.
```sh
curl -s https://socallights.app/api/ads/report -X POST -H "Authorization: Bearer $ADS_API_KEY" -H "User-Agent: SoCalLights-Grok-Ads/1.0" -H "Content-Type: application/json" -d '{
  "rows": [
    { "ad_id": "ct-a-meta", "campaign": "contest_organizers", "status": "active", "spend_cents": 1240, "impressions": 5120, "clicks": 61, "as_of": "2026-11-14T09:30:00-08:00" },
    { "ad_id": "ct-b-meta", "campaign": "contest_organizers", "status": "disapproved", "spend_cents": 0, "impressions": 0, "clicks": 0, "disapproval_reason": "Personal attributes policy", "as_of": "2026-11-14" }
  ] }'
```
| field | rule |
|---|---|
| `ad_id` | the id from the brief (lowercase letters, digits, hyphens) |
| `campaign` | the audience key: `contest_organizers`, `event_holders`, `installers`, `families`, `homeowners`. Must match the ad's campaign in the brief |
| `status` | `draft`, `in_review`, `active`, `paused`, `disapproved`, `ended` |
| `spend_cents`, `impressions`, `clicks` | whole numbers from 0; clicks cannot exceed impressions |
| `disapproval_reason` | optional text up to 300 characters; **required** with `disapproved`; no email or phone number |
| `as_of` | when the numbers were true: `2026-11-14` or an ISO time with zone. Not in the future, not older than 60 days. A row older than the one stored is skipped |

Answer:
```json
{ "ok": true, "accepted": 2, "skipped": [], "received_at": "2026-11-14T17:41:07Z",
  "totals": { "spend_cents": 1240, "impressions": 5120, "clicks": 61, "budget_cents": 30000, "loaded_cents": 28000, "reserve_cents": 2000 },
  "warnings": [ { "code": "disapproved", "message": "Ad ct-b-meta is disapproved: Personal attributes policy. Stop and tell the owner.", "ad_id": "ct-b-meta" } ] }
```
**Read `warnings` every time and act on them.** Codes: `over_loaded_budget` (total reported spend above $280: pause and tell the owner), `over_total_budget` (above $300: pause everything now), `campaign_over_budget`, `not_in_launch_set` (you reported an ad that is not approved: do not run it), `active_after_dec8` (an ad is active after Dec 8: pause it), `past_campaign_end` (active after its own campaign end date, for example installers after Nov 23), `disapproved`, `stale_report` (no report in 48 hours), `spend_decreased` (lifetime spend went down: check your numbers).

### `GET /api/ads/status`
What the site currently holds from you: the latest row per ad, totals, campaigns, ads you have not reported (`missing`), and the same warnings. Use it to see what you last reported.

## Cadence
Every 2 days: `GET /api/ads/status` (what is on file), read Meta's numbers, `POST /api/ads/report` for every ad in the brief (including paused and ended ones), act on `warnings`. After Dec 8 report each ad once as `ended` and stop.

## What the owner sees
Admin > Ads: each campaign's spend against its budget, a progress bar to $300, each ad's status, spend, clicks, last report time, landings per ref code (counted by the site, not by Meta), alerts (over budget, disapproved, running past Dec 8, no report in 48 hours) and a CSV. Ad copy and status change only by migration; there is no way to edit an ad through this API.

## Owner steps: create the key (once)
1. Generate a long random value (at least 32 characters) in your password manager. Do not type it into a chat, an email or a file in the repo.
2. Cloudflare dashboard > Workers & Pages > **socal-lights** > Settings > **Variables and Secrets** > **Production** > Add > Type **Secret** > name `ADS_API_KEY` > paste the value > Save.
3. **Redeploy** (Deployments > the latest production deployment > Retry deployment): a new secret applies only to a new deployment.
4. Give Grok the same value through its secret store, and hand it this file. Until the secret exists every endpoint answers `503`.
5. Check: Admin > Ads shows "Key set".
**Rotate** (every few months or if it may have leaked): edit the secret to a new value, Retry deployment, update Grok's store; until Grok has it its calls get `401`. **Revoke instantly:** delete the secret and Retry deployment (every call answers `503`).

## Creative files
Served from `/ad-assets/<asset-id>/<file>` (not linked from the site, not indexed). Until the owner approves the creative as final the folder is empty and `GET /api/ads/assets` returns `count: 0`; see `public/ad-assets/README.md`.
