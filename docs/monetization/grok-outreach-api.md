# SoCal Lights outreach API (hand this whole file to Grok)

_Self-contained. Written 2026-11-07, updated 2026-11-08 (server-side sequence timing, backfill, deliverability pre-check).  Base URL `https://socallights.app`. Companion: `grok-email-playbook.md` (wording, footer, sequence) and `grok-outreach-guide.md` (approved facts)._

## What this is, and what it is not
Before every outreach email you ask the app one question: **"is it safe to send acquisition mail to this address?"** The app answers with one status word per address. It returns **no names, no emails, no details**, and you get **no database access**. Everything the app stores about your prospects is a one-way hash, never the address.

You send from the owner's own mailbox. The app never sends your mail and never reads your mailbox.

## The rules (follow every one)
1. **Check immediately before every send** (the same minute), not once at the start of the day. People register and unsubscribe all day.
2. **Send only when ALL of these hold:** `status` is `clear`, `sequence.due` is `true`, and (if you asked for `verify`) `deliverability` is `ok` or `unknown`. Send the step in `sequence.next_step`, never another one. Any other result means: do not send to that address.
3. **If the check returns 503, `hold: true`, 429, any other error, a timeout, or a response you cannot read: HOLD ALL SENDS.** Retry the check later. Never send "because the check was down".
4. **`review` = flag to the owner, never send.** It means the address is probably the same business as someone already in the app, at another address. The owner decides.
5. **On any human reply, unsubscribe request, permanent bounce or complaint: call the API immediately** (`/api/outreach/event` with that event, or `/api/outreach/suppress`) **and stop the sequence for that person.** A reply is a human conversation: stop all automation and hand it to the owner.
6. **Report every send immediately** with `/api/outreach/event` (`event: "sent"`, the step and segment). The app's timing depends on it: a send you did not report is a follow-up the app cannot schedule, and an unreported send can be repeated.
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
Request (1 to 50 addresses; `domains` is optional, up to 50, for prospects whose website you know; `verify` is optional, see "Deliverability pre-check"):
```sh
curl -sS https://socallights.app/api/outreach/check \
  -H "Authorization: Bearer $OUTREACH_API_KEY" -H "Content-Type: application/json" \
  -d '{"emails":["info@brightnights.example","hello@sample-hoa.example"],"domains":["brightnights.example"],"verify":true}'
```
Response `200` (same order as your list; match by `i`; the address is NOT echoed back):
```json
{
  "ok": true,
  "results": [
    { "i": 0, "email_hash_prefix": "9f2c41ab", "status": "clear", "reasons": [],
      "sequence": { "next_step": 1, "due": true, "due_on": "2026-11-20", "reason": "due" },
      "deliverability": "ok" },
    { "i": 1, "email_hash_prefix": "03be77d1", "status": "registered", "reasons": ["account"],
      "sequence": { "next_step": null, "due": false, "due_on": null, "reason": "status_registered" },
      "deliverability": "ok" }
  ],
  "domains": [ { "domain": "brightnights.example", "status": "clear", "reasons": [] } ],
  "verify": { "dns_lookups": 2 }
}
```
`email_hash_prefix` (8 hex characters) is only a label for matching a line in a report; you cannot reverse it. `sequence` is always present. `deliverability` and the top-level `verify` appear only when the request had `"verify": true`; `domains` only when the request had `domains`. Older callers that ignore the new keys keep working.

### `sequence`: the app tells you what to send and when
The app computes the timing from the `sent` events you reported (event endpoint). You do not keep your own calendar.

| Field | Meaning |
|---|---|
| `next_step` | `0` original, `1` follow-up 1, `2` follow-up 2, or `null` (nothing to send, see `reason`). |
| `due` | `true` only when `status` is `clear` AND the step is due today or overdue by at most 14 days. |
| `due_on` | The Pacific date (`YYYY-MM-DD`) that step becomes due; `null` when `next_step` is `null`. |
| `reason` | Why: `no_original_sent_yet` (a new prospect: the original is due now), `due`, `not_due_yet`, `overdue_hold`, `sequence_finished`, `missing_original`, `reply` / `bounce` / `complaint` / `unsubscribe` (the event that stopped it), `status_<registered|listing|review|suppressed>`, `undeliverable_<invalid_syntax|no_mail_server|disposable>`. |

The owner-approved rules: the original is step 0. **Follow-up 1 is due 4 days after the original was sent; follow-up 2 is due 10 days after the original** (both counted from the original, in Pacific calendar days). A follow-up is due only if the previous step was sent and its date has been reached. After follow-up 2 the sequence is **finished and never restarts automatically** (`next_step` null, `sequence_finished`). A reply, bounce, complaint, unsubscribe or any status other than `clear` ends the sequence (`next_step` null). If a step is more than 14 days overdue, `due` is `false` with `overdue_hold`: **do not send; list it in your report and the owner decides.** The segment is ignored for timing (the earliest original counts). A follow-up on file with no original gives `missing_original` (do not send; tell the owner).

### Deliverability pre-check (`"verify": true`)
Free, no third party. For each address you also get `deliverability`:

| Value | Meaning | What you do |
|---|---|---|
| `ok` | Syntax is fine, not a throwaway domain, and the domain has a mail server (an MX record, or none but an A/AAAA record, per RFC 5321). Well-known free-mail providers are `ok` without a lookup. | May send if the other rules hold. |
| `unknown` | The DNS lookup timed out or failed (2 second limit per lookup). The app never turns a failed lookup into "no mail server". | May send if the other rules hold. |
| `invalid_syntax` | Not a valid address (spaces, two `@`, bad domain, too long...). | Do not send. Skip and report to the owner. |
| `no_mail_server` | The domain does not exist, publishes a null MX ("accepts no mail"), or has no MX, A or AAAA record. | Do not send. Skip and report to the owner. |
| `disposable` | A well-known temporary-mail domain (about 50 are built in). | Do not send. Skip and report to the owner. |

Send only when `status` is `clear` AND `deliverability` is `ok` or `unknown` AND `due` is `true`. A bad address is not a person who asked to be left alone: **do not suppress it.** Just skip and report it. You may tell the app with `event: "invalid"` (below) so later checks answer instantly.

Limits (Cloudflare free plan: 50 outgoing requests per call): with `verify`, a call may include at most **20 distinct domains the app has not looked up in the last 24 hours** (answers are cached per domain for 24 hours). More than that answers `400 {"hold":true,...}`: send a smaller batch (or send the same batch again later; what was looked up is cached). The DNS question goes to Cloudflare's public resolver and contains only the domain name, never the part before the `@`. If a call leaves some lookups unfinished (time budget), those addresses come back `unknown` and are looked up on a later call.

**What this does NOT do.** It does not prove a mailbox exists: there is no SMTP probing (Workers cannot, and should not). It catches typos, dead domains and throwaways. **Real bounces must still be reported by you through the event endpoint; a permanent bounce means suppress** (`event: "bounce"`). If bounces exceed about 2% of sends, the owner can add a paid verifier (for example ZeroBounce, NeverBounce or Kickbox) later.

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

Other codes: `400` bad request (more than 50 addresses, not a list of strings, `verify` not true/false, or more than 20 new domains with `verify`; fix the call and re-check), `429` more than 60 calls this minute (honor `Retry-After`; hold meanwhile).

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
- `event`: `sent`, `reply`, `bounce`, `complaint`, `unsubscribe`, or `invalid` (see below).
- `step`: `0` original, `1` first follow-up, `2` second follow-up.
- `segment`: `installer`, `contest` (organizers) or `event_host` (seasonal-event hosts).
- `reply`, `bounce`, `complaint` and `unsubscribe` **also add the address to the do-not-contact list automatically**. You do not need a separate suppress call for those. (`bounce` means a permanent bounce; a temporary one is not an event.)
- **`sent_at` (optional, only with `event: "sent"`)**: `"YYYY-MM-DD"`, to **backfill** an email you sent before this API existed. It must be a real date, not in the future (Pacific), within the last 120 days; anything else is a `400`. Per address and step the app keeps **one** `sent` row with the **earliest** date: repeating a call is harmless (`"duplicate": true`), a later date never overrides an earlier one, an earlier date moves it earlier. Without `sent_at` the date is today (Pacific). Backfill every earlier send (step 0, and step 1 if you sent it) **before** the first scheduled loop, otherwise the app thinks those people were never emailed and will say `next_step: 0, due: true`.
- **`event: "invalid"`** with `"reason": "invalid_syntax" | "no_mail_server" | "disposable"` (no `step` or `segment` needed): remembers, as a hash, that this address cannot receive mail. It does **not** suppress. Later checks answer `deliverability` with that reason at once (and `sequence.next_step` null, reason `undeliverable_...`).
- The app uses these only for counts by segment and step and for the sequence timing. It never stores the address.

## The follow-up sequence the owner approved
Two follow-ups, then stop. **Never auto-restart a sequence** (a new campaign on the same person needs the owner's approval). The app enforces the timing in `sequence` (see above); you only follow it.

| Step | When | Content |
|---|---|---|
| 0 original | Day 0 | The segment template in `grok-email-playbook.md`. |
| 1 follow-up 1 | 4 days after the original was sent | A brief reminder with **one relevant listing example** (a real listing from socallights.app in their city or a nearby one, as a link). |
| 2 follow-up 2 | 10 days after the original was sent | **Offer help** getting their listing or contest started (for example "reply and I will walk you through it, it takes about 5 minutes"). Then the sequence ends. |

Rules that go with it:
- Use **separate wording** for installers, contest organizers and seasonal-event hosts (`grok-email-playbook.md`).
- **Reply in the existing thread** (so it reads as one conversation), with `info@socallights.app` as **Reply-To**.
- **A reply becomes a human conversation: stop the automation** for that person, call `/api/outreach/event` with `reply`, and hand the thread to the owner.
- Unsubscribe words in a reply ("stop", "remove me", "unsubscribe", "not interested"): call `/api/outreach/event` with `unsubscribe` immediately, send nothing more, answer only if the owner's playbook says to.
- `registered` or `listing` after the original is a success: log it, do not email them again.

## The send loop (automated, every 2 days)
1. **Read the mailbox first**: for every reply, unsubscribe request, bounce or complaint since the last run, call `/api/outreach/event` (this suppresses) **before** anything is sent.
2. Take your prospect list. **Call `check` in batches of 50** with `"verify": true` (if a batch answers `400` about new domains, split it into smaller batches, about 20 new domains each).
3. If any call fails in any way (non-200, `hold: true`, timeout): **hold all sends**, stop, retry on the next run.
4. For each result, **send only if** `status == "clear"` AND `sequence.due == true` AND `deliverability` is `ok` or `unknown`. Send **the step in `sequence.next_step`** (never a different one), with the wording for that prospect's segment.
5. **Immediately after each send**, call `POST /api/outreach/event` with `event: "sent"`, that step and the segment. If that call fails, retry until it succeeds before sending anything else to the same person.
6. For results that are not sent, **do not decide yourself**; put them in your report to the owner by reason: `overdue_hold`, `review`, `missing_original`, `invalid_syntax`, `no_mail_server`, `disposable`. Everything else (`not_due_yet`, `sequence_finished`, replies, suppressed, registered, listing) is simply skipped.
7. A **new address you found** works the same way: `check` says `next_step: 0, due: true` (reason `no_original_sent_yet`) if it is clear and deliverable; you send the original and report `sent` step 0. The follow-ups then come from the app on day 4 and day 10.
8. **Once, before the first scheduled run**: report every email you already sent with `sent_at` (backfill, above), so the app knows who is on which step.

```
every 2 days:
    handle replies / bounces / complaints / unsubscribes  -> POST /api/outreach/event  (suppresses)
    for each batch of up to 50 prospects:
        r = POST /api/outreach/check { emails, verify: true }
        if not HTTP 200: HOLD ALL SENDS, stop
        for each result with status == "clear" and sequence.due and deliverability in (ok, unknown):
            send step sequence.next_step (segment wording, same thread, Reply-To info@socallights.app)
            POST /api/outreach/event { email, event: "sent", step, segment }
        report the rest by sequence.reason / deliverability
```
On every incoming reply, bounce or complaint, **first** call `/api/outreach/event` (this suppresses), **then** deal with the message. The daily send caps in the playbook still apply: if the cap is reached, leave the rest for the next run (they stay due for up to 14 days).

## What Grok must be able to do (the owner confirms this with Grok's product before activating)
- [ ] Make **HTTPS POST requests with an `Authorization: Bearer ...` header** and a JSON body, and read the JSON answer.
- [ ] **Run on a schedule every 2 days** (not only when the owner chats with it).
- [ ] **Read the mailbox** for replies, unsubscribes, bounces and complaints, and tell them apart.
- [ ] **Store a secret** (the API key) without printing it into chats, logs or emails.
- [ ] Send from the owner's mailbox in the same thread, with a footer, and keep its own record of what it sent.

**If it cannot do one of these**, the owner is the fallback and nothing breaks, because the app is the source of truth. If Grok cannot call the API or run on a schedule, the owner pastes Grok's prospect list or sent log into **Admin > Outreach > Reconcile** (up to 500 addresses at a time). It returns counts by status, **how many are due today for each step**, and a CSV with the next step and due date per address, which Grok (or the owner) can use to send by hand. If Grok cannot read the mailbox for bounces and replies, do not run follow-ups until replies are being captured (the owner forwards replies and bounces, and asks Grok to call the suppress endpoint for them).

## What the owner sees
Admin > Outreach shows the number of checks, how many came back clear, the suppression count and results by segment and step: sent, replies, bounces, complaints, unsubscribes, and the number of people who registered or listed something after being emailed (counted from the app's own records, not opens). The owner can also reconcile your sent log against the app in bulk, and sees how many addresses are due today for each step.

## Pilot plan
1. **Reconcile.** The owner pastes your sent log (up to 500 addresses at a time) into Admin > Outreach and gets counts by status plus a CSV. Anyone already `registered`, `listing` or `suppressed` is excluded from follow-ups.
2. **Review.** The owner reviews the list of eligible recipients and the two follow-up templates.
3. **Nothing is activated until the owner approves.** No follow-up goes out and the sequence does not start before then.
4. **Metrics:** registrations and listings generated, replies, bounces, unsubscribes. **Not opens.**

## Quick reference
| Call | Success | Hold or stop |
|---|---|---|
| `POST /api/outreach/check` | `200`; send only if `status == "clear"`, `sequence.due`, and (with `verify`) `deliverability` is `ok` or `unknown` | anything else: hold |
| `POST /api/outreach/suppress` | `200 {"ok":true}` | `503`: retry; keep the person unsent meanwhile |
| `POST /api/outreach/event` | `200 {"ok":true}` | `503`: retry; keep the person unsent meanwhile |
| any | | `401`: stop and tell the owner; `429`: wait, hold; `503`: hold |
