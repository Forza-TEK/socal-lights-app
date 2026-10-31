# SoCal Lights: operating guide

Last updated 2026-10-30. This is the one page that says where SoCal Lights work happens.

## Where to work
- **All SoCal Lights work happens in a Claude Code session (claude.ai/code) with the repo `Forza-TEK/socal-lights-app` attached.** The repo is what makes a session know the setup: it loads `CLAUDE.md`, which points here. The claude.ai Project "SoCal-Lights" is optional extra context; a copy of this guide is stored there too.
- The session can also be linked to the work computer (Claude desktop app) for OneDrive files and Claude in Chrome. Link it when the work needs Chrome or the OneDrive folder `SoCal Lights App`.
- Source of truth for code and event data: GitHub (`socal-lights-app`). OneDrive holds non-code files only (notes, raw reading files). Never keep a git working copy inside OneDrive.
- Design mockups and one-off pages are artifacts titled `[SCL] ...`.

## Background agents (all in the Code scheduled-task list, prefix [SCL])
| Task | When (Pacific) | Needs work computer? | Job |
|---|---|---|---|
| [SCL] City sweep | 4:13, 12:13, 20:13 daily | No | One city group per run: new events, contest homes, photos |
| [SCL] Weekly upkeep | Mondays 6:47 | No | Confirm dates, fix details, remove dupes, season roll-overs |
| [SCL] Midweek upkeep (Nov-Dec) | Wed + Sat 6:52, Nov-Dec | No | Date confirmation, contest homes, photos |
| [SCL] Monthly photo refresh | 1st of month 2:37 | No | New photos, replace dead ones |
| [SCL] Browser pass (Chrome, needs work computer) | Tue + Fri 10:23 | **Yes** (computer on, Claude desktop + Chrome open) | Reads the city calendars that block the bot |

All publish straight to `main` after validation (owner authorized 2026-10-28). Check the GitHub Actions run "Apply database migrations" if anything looks off. Full prompts live in the tasks; the rules they follow are in the repo docs (`docs/sweep-methods.md`, `docs/updating-events.md`, `docs/browser-pass.md`).

## Rules of the road
- Events change only through new numbered migrations in `migrations/`; never edit an old one.
- Never invent events, dates or prices; only add what a loaded public page shows.
- If a site refuses Claude in Chrome, stop on that site and list it in `docs/blocked-sites.md`.
- Update `docs/status.md` at the end of every working session.
- Task names start with `[SCL]`; use `[DA]` for David August, Inc. and `[WEB]` for website projects so lists stay readable.

## Known limits
- Scheduled cloud tasks cannot open Chrome; only the browser pass (bound to the work computer) can.
- Picking up on the home computer is set up but untested (see `docs/workstation-setup.md` in the repo).
