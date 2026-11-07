# SoCal Lights outreach API (hand this whole file to Grok)

_Self-contained. Written 2026-11-07. Base URL `https://socallights.app`. Companion: `grok-email-playbook.md` (wording, footer, sequence) and `grok-outreach-guide.md` (approved facts)._

## What this is, and what it is not
Before every outreach email you ask the app one question: **"is it safe to send acquisition mail to this address?"** The app answers with one status word per address. It returns **no names, no emails, no details**, and you get **no database access**. Everything the app stores about your prospects is a one-way hash, never the address.

You send from the owner's own mailbox. The app never sends your mail and never reads your mailbox.

## The rules (follow every one)
1. **Check immediately before every send** (the same minute), not once at the start of the day. People register and unsubscribe all day.
2. **Send only when the status is `clear`.** Any other status means: do not send acquisition mail to that address.
3. **If the check returns 503, `hold: true`, 429, any other error, a timeout, or a response you cannot read: HOLD ALL SENDS.** Retry the check later. Never send "because the check was down".
4. **`review` = flag to the owner, never send.** It means the address is probably the same business as someone already in the app, at another address. The owner decides.
5. **On any human reply, unsubscribe request, permanent bounce or complaint: call the API immediately** (`/api/outreach/event` with that event, or `/api/outreach/suppress`) **and stop the sequence for that person.** A reply is a human conversation: stop all automation and hand it to the owner.
6. **Report every send** with `/api/outreach/event` (`event: "sent"`, the step and segment). This is how the owner measures the pilot.
7. **At most 50 emails per `check` call, at most 60 calls a minute** (all endpoints together). The server enforces both.
8. Never put the key in an email, a chat, a log, a file in the repo or a URL. Never print the Authorization header. Never store the app's answers next to prospect addresses in a place the owner has not approved.
9. Keep the original rules: approved facts only, postal address and opt-out line in every email (`grok-email-playbook.md`), business addresses from public sources only, nothing is activated until the owner approves.

## Authentication
Every call carries the shared key (given to you by the owner out of band, held in your secret store):
```
Authorization: Bearer <OUTREACH_API_KEY>
Content-Type: application/json
```
- No header or a wrong key: `401 {"error":"Not allowed."}`.
- The app has no key configured (feature switched off, or revoked): `503 {"hold":true,...}`. Hold all sends.
- The key can be rotated or revoked by the owner at any time; a sudden 401 means stop and tell the owner.

## 1. Check addresses: `POST /api/outreach/check`
Request (1 to 50 addresses; `domains` is optional, up to 50, for prospects whose website you know):
```sh
curl -sS https://socallights.app/api/outreach/check \
  -H "Authorization: Bearer $OUTREACH_API_KEY" -H "Content-Type: application/json" \
  -d '{"emails":["info@brightnights.example","hello@sample-hoa.example"],"domains":["brightnights.example"]}'
```
Response `200` (same order as your list; match by `i`; the address is NOT echoed back):
```json
{
  "ok": true,
  "results": [
    { "i": 0, "email_hash_prefix": "9f2c41ab", "status": "clear", "reasons": [] },
    { "i": 1, "email_hash_prefix": "03be77d1", "status": "registered", "reasons": ["account"] }
  ],
  "domains": [ { "domain": "brightnights.example", "status": "clear", "reasons": [] } ]
}
```
`email_hash_prefix` (8 hex characters) is only a label for matching a line in a report; you cannot reverse it.

### Status meanings
| status | Meaning | What you do |
|---|---|---|
| `clear` | Not registered, not a known contact of any submission, not suppressed, no matching business domain. | You may send (if every other rule is met). |
| `registered` | Has an account. | Do **not** send acquisition mail. |
| `listing` | Is the contact or owner of something already in the app (event, home, installer profile, contest, claim, quote request, sponsor record, alert signup, order, monthly-update subscriber...). | Do **not** send. |
| `review` | Not an exact match, but the address's domain equals the website of a registered installer, organizer or contest, or the same non-free-mail domain as a registered user, or the address is not valid. Uncertain: the app never guesses. | Do **not** send. Flag to the owner in your daily report. |
| `suppressed` | On the do-not-contact list (you or the app put it there: reply, unsubscribe, bounce, complaint, a removal request, a deleted account, an app unsubscribe). | Do **not** send, ever. |

`reasons` are short machine labels (for example `account`, `event_submission`, `installer_profile`, `same_domain_as_installer_website`, `suppression_list`, `invalid_address`). They never contain personal data. Free-mail domains (gmail.com, yahoo.com, outlook.com, icloud.com and similar) never produce `review`.

### Failure: hold everything
Any failed lookup answers:
```json
HTTP 503  { "hold": true, "error": "The check could not be completed. Hold all sends." }
```
`hold: true` also appears on 400, 405, 429 and the unconfigured 503. Treat `hold: true`, any non-200 status, a timeout or a malformed body the same way: **do not send anything until a later check returns 200.**

Other codes: `400` bad request (more than 50 addresses, not a list of strings; fix the call and re-check), `429` more than 60 calls this minute (honor `Retry-After`; hold meanwhile).

## 2. Suppress: `POST /api/outreach/suppress`
Adds an address to the shared do-not-contact list. Idempotent: calling it twice is harmless.
```sh
curl -sS https://socallights.app/api/outreach/suppress \
  -H "Authorization: Bearer $OUTREACH_API_KEY" -H "Content-Type: application/json" \
  -d '{"email":"info@brightnights.example","reason":"reply","source":"grok-outlook"}'
# 200 {"ok":true,"suppressed":true,"email_hash_prefix":"9f2c41ab"}
```
`reason`: `reply`, `unsubscribe`, `bounce`, `complaint` or `manual`. `source`: free text, at most 40 characters (for example the mailbox or tool name). Use `manual` for "no thanks" you decide to honor. Same-person spellings (a `+tag`, Gmail dots) are suppressed together.

## 3. Report an event: `POST /api/outreach/event`
```sh
curl -sS https://socallights.app/api/outreach/event \
  -H "Authorization: Bearer $OUTREACH_API_KEY" -H "Content-Type: application/json" \
  -d '{"email":"info@brightnights.example","event":"sent","step":0,"segment":"installer"}'
# 200 {"ok":true,"suppressed":false,"email_hash_prefix":"9f2c41ab"}
```
- `event`: `sent`, `reply`, `bounce`, `complaint`, `unsubscribe`.
- `step`: `0` original, `1` first follow-up, `2` second follow-up.
- `segment`: `installer`, `contest` (organizers) or `event_host` (seasonal-event hosts).
- `reply`, `bounce`, `complaint` and `unsubscribe` **also add the address to the do-not-contact list automatically**. You do not need a separate suppress call for those. (`bounce` means a permanent bounce; a temporary one is not an event.)
- The app uses these only for counts by segment and step. It never stores the address.

## The follow-up sequence the owner approved
Two follow-ups, then stop. **Never auto-restart a sequence** (a new campaign on the same person needs the owner's approval).

| Step | When | Content |
|---|---|---|
| 0 original | Day 0 | The segment template in `grok-email-playbook.md`. |
| 1 follow-up 1 | about 4 days after the original | A brief reminder with **one relevant listing example** (a real listing from socallights.app in their city or a nearby one, as a link). |
| 2 follow-up 2 | about 10 days after the original | **Offer help** getting their listing or contest started (for example "reply and I will walk you through it, it takes about 5 minutes"). Then the sequence ends. |

How to run it:
- **Check eligibility every 2 days**, but **send only when the next message is due** (day 4 or day 10, counted from the original, in business days only if the owner says so). The every-2-days check is a loop over the people whose next step is due; it is not a reason to send more often.
- **Each send is preceded by `POST /api/outreach/check`** for that address. Not `clear` now (they registered, listed, unsubscribed, or another address matched)? **Stop that person's sequence** and do not send the follow-up. `registered` or `listing` after the original is a success: log it, do not email them again.
- Use **separate wording** for installers, contest organizers and seasonal-event hosts (`grok-email-playbook.md`).
- **Reply in the existing thread** (so it reads as one conversation), with `info@socallights.app` as **Reply-To**.
- **A reply becomes a human conversation: stop the automation** for that person, call `/api/outreach/event` with `reply`, and hand the thread to the owner.
- Unsubscribe words in a reply ("stop", "remove me", "unsubscribe", "not interested"): call `/api/outreach/event` with `unsubscribe` immediately, send nothing more, answer only if the owner's playbook says to.

## A safe send loop, in order
```
for each prospect whose next message is due:
    verdict = POST /api/outreach/check  { emails: [prospect] }    # batch up to 50 due prospects per call
    if the call failed in any way (non-200, hold:true, timeout):  HOLD ALL SENDS, stop the loop, retry later
    if verdict.status != "clear":  stop this prospect's sequence (flag "review" to the owner); continue
    send the email (footer with postal address and opt-out line; Reply-To info@socallights.app)
    POST /api/outreach/event { email, event: "sent", step, segment }
```
On every incoming reply, bounce or complaint, **first** call `/api/outreach/event` (this suppresses), **then** deal with the message.

## What the owner sees
Admin > Outreach shows the number of checks, how many came back clear, the suppression count and results by segment and step: sent, replies, bounces, complaints, unsubscribes, and the number of people who registered or listed something after being emailed (counted from the app's own records, not opens). The owner can also reconcile your sent log against the app in bulk.

## Pilot plan
1. **Reconcile.** The owner pastes your sent log (up to 500 addresses at a time) into Admin > Outreach and gets counts by status plus a CSV. Anyone already `registered`, `listing` or `suppressed` is excluded from follow-ups.
2. **Review.** The owner reviews the list of eligible recipients and the two follow-up templates.
3. **Nothing is activated until the owner approves.** No follow-up goes out and the sequence does not start before then.
4. **Metrics:** registrations and listings generated, replies, bounces, unsubscribes. **Not opens.**

## Quick reference
| Call | Success | Hold or stop |
|---|---|---|
| `POST /api/outreach/check` | `200`, send only `status == "clear"` | anything else: hold |
| `POST /api/outreach/suppress` | `200 {"ok":true}` | `503`: retry; keep the person unsent meanwhile |
| `POST /api/outreach/event` | `200 {"ok":true}` | `503`: retry; keep the person unsent meanwhile |
| any | | `401`: stop and tell the owner; `429`: wait, hold; `503`: hold |
