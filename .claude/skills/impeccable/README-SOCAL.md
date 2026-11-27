# Impeccable (installed 2026-11-27)

Design skill from https://github.com/pbakaus/impeccable (Apache 2.0, version 4.11.1, copied from `plugin/skills/impeccable`).

What was installed: `SKILL.md` and `reference/*.md` only (the design guidance and command playbooks).
What was deliberately NOT installed: the plugin's `hooks/` (they run a shell script after every file edit and at session start) and `scripts/` (a launcher binary that `SKILL.md` calls for `context`, `shot` and `live`). SKILL.md's own "Launcher unavailable" path says to read PRODUCT.md / DESIGN.md directly; do that. Do not add the hooks or scripts without the owner's say-so.

Use: `/impeccable audit <page>`, `critique`, `polish`, `layout`, `clarify`, `adapt` ... (see the Commands table in SKILL.md). This site is an operate/read-mode product (map, profile, Admin): precision and consistency over decoration, and keep the existing brand (see public/tokens.css).
