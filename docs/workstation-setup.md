# Working with Claude from the work and home computers

Goal: one Claude session that has everything it needs (this repo, git and npm, the owner's Chrome, the OneDrive folders), and that can be picked up from either computer.

## What lives where
| Thing | Where | Why |
|---|---|---|
| Code, docs, migrations | GitHub: `Forza-TEK/socal-lights-app` | The source of truth. Both computers and every Claude session get the same copy from here. |
| Handoff state | `docs/status.md`, `CLAUDE.md`, this file | Anything a new session must know is written here, not left in a chat. Update `docs/status.md` at the end of every session. |
| Inputs and outputs that are not code (result files, flyers, screenshots, exports) | OneDrive: `My Desktop\SoCal Lights App\` | Syncs to both computers. |
| A working copy of the repo | **Not in OneDrive** | OneDrive syncing a git repo (`.git`, `node_modules`) causes conflicts and corruption. If you want a local clone, keep it outside OneDrive (for example `C:\dev\socal-lights-app`). |

## The session
One Claude session (claude.ai/code) with all of this connected:
1. The repo `Forza-TEK/socal-lights-app` attached to the session (clone, branch, PR, merge, `npm run validate`).
2. The session linked to a computer through the Claude desktop app ("Link to this computer"), with the `SoCal Lights App` folder connected. That is how it reads and writes OneDrive files.
3. Claude in Chrome installed in that computer's Chrome and signed in to the same Claude account. That is how it opens the city calendars that block our bot.

This was set up and worked end to end on 2026-10-30 from the work computer: read city calendars in Chrome, wrote a migration, validated it, and opened a PR, all in one session.

## Switching to the home computer
Not tested yet. The steps should be:
1. Home computer: Claude desktop app signed in; Chrome with the Claude in Chrome extension signed in; OneDrive signed in so `My Desktop\SoCal Lights App` has synced.
2. Open the same session in the desktop app and choose "Link to this computer". Connect the `SoCal Lights App` folder again.
3. In Chrome, allow the sites the task needs when asked (or pre-allow them in the extension settings so unattended-looking runs do not stall).
4. Tell the session to read `docs/status.md`. It then knows where the last session stopped.
A session is linked to one computer at a time, so a computer must be on, online and have the Claude app open for Chrome and folder work.

## What does not work, and what to do
- **Scheduled routines (cloud) have no Chrome.** They are fine for sources that load for the bot. The Chrome-only sources (see the Chrome column in `docs/blocked-sites.md`) need a session linked to a computer. A recurring Chrome pass would have to be a scheduled task that requires the computer, which only runs while that computer is on.
- **The cloud shell cannot reach `socallights.app` or Nominatim.** Do the duplicate check and geocoding from Chrome (see `docs/browser-pass.md`).
- **Each new site needs a one-time Chrome permission.** Pre-approving the city domains removes the prompts.
- Never put secrets in OneDrive files or in the repo. `CLOUDFLARE_API_TOKEN` and `TURNSTILE_SECRET` stay in GitHub and Cloudflare.
