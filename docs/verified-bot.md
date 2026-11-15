# SoCalLightsBot as a Cloudflare verified bot

Goal (owner, 2026-11-15): many of the sites that turn our bot away sit behind Cloudflare. Cloudflare keeps a directory of verified bots (BotBase, shown in Cloudflare Radar); a verified bot is excluded from Cloudflare's default bot-blocking on the sites that use it. We do not spoof or evade anything: we prove who we are.

## What Cloudflare requires (read from developers.cloudflare.com on 2026-11-15; re-read before applying, they change)
- **Honest identification**, one of two ways: a **Web Bot Auth** signature on each request (an Ed25519 key, public half published at `/.well-known/http-message-signatures-directory`), or **IP validation** (a published list of IP addresses used only by the service, plus a stable user-agent). We cannot use IP validation (our requests leave from shared cloud addresses), so we use Web Bot Auth.
- **Non-abusive behavior**: obey robots.txt and crawl directives, keep request rates reasonable, never evade site owners' preferences.
- **A disclosed purpose** that matches the traffic, with public documentation: <https://socallights.app/bot>.
- No traffic or scale minimum is stated. No review time is stated. Statuses: Waiting for review, Accepted, Rejected, Cancelled; track them in the dashboard under BotBase > Submission history.
- A bot is removed if it breaks these rules (for example ignores robots.txt, or its traffic does not match the stated purpose).

## What it will and will not do for us
- **Helps:** sites on Cloudflare whose bot rules let verified bots through (our Cloudflare-challenge 403s: Visit Crestline, Tock, event.marriott.com, and others).
- **Does not help:** sites behind another vendor (Akamai: Whittier, Barstow, Hawthorne and others), sites whose owners block verified bots too, or any fetch we cannot sign. The unattended sweeps read pages through tools whose requests we do not control, so only the pages fetched by **our own code** (the server's page checks, `scripts/photo_pass.py`, `scripts/video_pass.py`, `scripts/signed-fetch.mjs`) can carry the signature. Everything that stays blocked goes to the browser pass (`docs/browser-pass.md`).

## What is built (2026-11-15)
- `functions/_lib/webbotauth.js`: signing (RFC 9421, tag `web-bot-auth`, covers `@authority` and `signature-agent`, 60 s expiry) and the signed key directory; `functions/.well-known/http-message-signatures-directory.js` serves it (404 until the secret exists).
- `functions/_lib/robots.js` and `scripts/robots_ok.py`: robots.txt first for every fetch of ours (server page checks, photo and video scripts, signed fetch).
- <https://socallights.app/bot> (`public/bot.html`): what the bot is, its user-agent, how it behaves, how to block it, contact `info@socallights.app`.
- `scripts/bot-keys.mjs` (`--make`, `--check`, `--crawltest`) and `scripts/signed-fetch.mjs` (one polite, signed read of a page).
- Tested end to end: the directory verifies with its own key on the dev server, and Cloudflare's test endpoint `crawltest.com/cdn-cgi/web-bot-auth` answers 401 ("format is right, key not registered") for a signed request.

## Owner steps (about 15 minutes; only you can do these)
1. **Make the key.** On your computer, in the repo folder: `node scripts/bot-keys.mjs --make bot-signing-key.json`. It writes the PRIVATE key to that file and prints only the public key and key id. Never paste the key into a chat or commit it.
2. **Store it as a Pages secret.** Cloudflare dashboard > Workers & Pages > `socal-lights` > Settings > Variables and Secrets > Add > Type **Secret**, name `BOT_SIGNING_KEY`, value = the whole contents of the file (one line of JSON), Production. Save, then redeploy (Deployments > Retry deployment, or the next merge).
3. **Check it.** `node scripts/bot-keys.mjs --check` should print `OK: ... serves one Ed25519 key, signed correctly`. With the key in your environment, `BOT_SIGNING_KEY="$(cat bot-signing-key.json)" node scripts/bot-keys.mjs --crawltest` should answer 401 before approval and 200 after.
4. **Submit the form.** Cloudflare dashboard > Manage Account > Configurations > **Bot Submission Form**:
   - Verification method: **Request Signature**
   - Validation instructions: `https://socallights.app/.well-known/http-message-signatures-directory`
   - User agent: `SoCalLightsBot` (match: contains)
   - Category: **Data Collection** (it reads public event pages to keep a free public map accurate); operation: **Direct**
   - Purpose and documentation: `https://socallights.app/bot`; contact `info@socallights.app`
   Then watch BotBase > Submission history. If it is Rejected, the page says why; send the reason and we fix it.
5. **Optional, for the sweeps:** add the same private key as a secret variable named `BOT_SIGNING_KEY` in the cloud environment the scheduled tasks use (the cloud environment menu in the session's title bar > Edit). Never paste it into a chat. Once it is Accepted, the sweeps use `node scripts/signed-fetch.mjs <url>` for a page that returned 403 to the plain bot. Delete `bot-signing-key.json` when you are done.

## Rules for the sweeps (also in `docs/sweep-methods.md`)
- Same honest user-agent always; robots.txt first; at most about one request a second to a host; no retry after a 403, 429 or a challenge page, except one signed read through `scripts/signed-fetch.mjs` once Cloudflare has verified the bot.
- A page that still refuses goes to the browser pass (`docs/browser-pass.md`) or, for good, to a request to the site for a feed or an allow (`docs/blocked-sites.md`).
