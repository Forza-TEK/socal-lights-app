# Tutorials page

`/tutorials` lists short how-to videos grouped by process (find and plan, enter a home, vote and judge, run a contest, sponsors and installers, post events and homes). Finished videos are MP4 files in `public/tutorials/` (with a `.jpg` thumbnail) and play on the page; links to YouTube, Vimeo or Cloudflare Stream work too.

## Add a video
Open `public/tutorials.json`, find the video by its `id`, and paste its link into `url` (optionally add `length`, like `"1:30"`). A video with an empty `url` shows "Coming soon". Push to `main`; the page updates on its own (no version bump needed).

Add `"poster": "/tutorials/<name>.jpg"` next to `url` to show a thumbnail. Links that play on the page:
- A file in this repo, for example `/tutorials/run-quick.mp4`
- YouTube (`https://youtu.be/...` or `https://www.youtube.com/watch?v=...`)
- Vimeo (`https://vimeo.com/123456`)
- Cloudflare Stream (the iframe or watch link from the Stream dashboard)
- A direct `.mp4`, `.webm` or `.mov` file link

Each card has a link of its own, `/tutorials#v-<id>` (for example `/tutorials#v-vote`), which opens and plays that video. Use it from emails, the contest page or the wizard.

## Add a group or a video
Add an entry to `public/tutorials.json` (`groups[].videos[]`, with `id`, `title`, `desc`, `url`, `length`). Groups with no videos are hidden.

## Record a video
`scripts/tutorials/` holds the recording setup (used for the Vote and judge videos; the Run a contest videos were made with an earlier, uncommitted version of it).
- `seed-demo.mjs <dir>` writes SQL, cookies and photo lists for a made-up "Maple Street Holiday Lights 2026" contest (organizer, voter, judge, six homes). Load it into the **local** database only: `wrangler d1 execute socal-lights --local --file <dir>/seed.sql`, then upload the photos with `wrangler r2 object put ... --local`.
- `record.mjs` records a spec with Playwright against `npx wrangler pages dev public` (needs `DEV_AUTH=1` in `.dev.vars`), with a visible cursor, tap ripples, captions, a title card and an end card. The `hfc_female` Piper voice (`tts.py`, softened with ffmpeg) is timed to each step.
- One spec file per group: `run-contest.mjs`, `vote-judge.mjs`, `enter-home.mjs`, `find-plan.mjs`, `sponsors-installers.mjs`, `post-events-homes.mjs`. Every video starts on the map (`steps.mjs` builds the numbered trail) or from an example email (`mail:` steps show the app's real email in a mock inbox).
- `install.mjs <outDir>` copies finished videos into `public/tutorials/` and fills `url`, `poster` and `length` in `tutorials.json`, keeping each video in its group slot.
- `vote-judge.mjs` is the spec for the two Vote and judge videos. Narration is the `say` text of each step, so changing a line means editing it and re-recording that one video (about two minutes).
- Environment: `VOICE` (the `en_US-hfc_female-medium.onnx` file), `COOKIES`, `WORK`, `OUT`, `PLAYWRIGHT_PATH`.

## Merging in small batches
Videos go live in small batches, each only after review (see `docs/tutorial-standard.md`). For a batch: `node scripts/tutorials/install.mjs <outDir> id id ...` copies each video, its thumbnail and its captions file (`.vtt`) into `public/tutorials/` and fills `url`, `poster`, `captions` and `length` in `tutorials.json`. Review copies kept by the recorder (`public/tutorials/_review/`) are git-ignored and never merged.

## Keeping videos current
After any visible UI change, list the affected videos in `docs/tutorial-updates.md` (what changed, re-record or leave). The first full list is dated 2026-11-06.
