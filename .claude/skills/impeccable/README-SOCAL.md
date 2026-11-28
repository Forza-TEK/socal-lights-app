# Impeccable (installed 2026-11-27)

Design skill from https://github.com/pbakaus/impeccable (Apache 2.0, version 4.11.1, copied from `plugin/skills/impeccable`).

What is installed: `SKILL.md`, `reference/*.md`, and (added 2026-11-28 at the owner's request) the launcher in `scripts/` plus project hooks in `.claude/settings.json` (SessionStart, a check after each Edit/Write, and a design pass at Stop). The hooks run `scripts/impeccable hook`; the launcher downloads the pinned engine (version in `scripts/VERSION`) from the project's GitHub release into `~/.impeccable`, checks it against `scripts/engine-checksums.txt`, and the hooks set `IMPECCABLE_TELEMETRY=off` / `DO_NOT_TRACK=1`. The binary is not committed. Turn the hooks off with `impeccable hooks off`, or delete the `hooks` block in `.claude/settings.json`. The upstream `live-browser*` scripts were not copied.

Use: `/impeccable audit <page>`, `critique`, `polish`, `layout`, `clarify`, `adapt` ... (see the Commands table in SKILL.md). This site is an operate/read-mode product (map, profile, Admin): precision and consistency over decoration, and keep the existing brand (see public/tokens.css).
