# Tutorials page

`/tutorials` lists short how-to videos grouped by process (find and plan, enter a home, vote and judge, run a contest, sponsors and installers, post events and homes). The site only hosts the list and plays the videos; it does not produce them.

## Add a video
Open `public/tutorials.json`, find the video by its `id`, and paste its link into `url` (optionally add `length`, like `"1:30"`). A video with an empty `url` shows "Coming soon". Push to `main`; the page updates on its own (no version bump needed).

Links that play on the page:
- YouTube (`https://youtu.be/...` or `https://www.youtube.com/watch?v=...`)
- Vimeo (`https://vimeo.com/123456`)
- Cloudflare Stream (the iframe or watch link from the Stream dashboard)
- A direct `.mp4`, `.webm` or `.mov` file link

Each card has a link of its own, `/tutorials#v-<id>` (for example `/tutorials#v-vote`), which opens and plays that video. Use it from emails, the contest page or the wizard.

## Add a group or a video
Add an entry to `public/tutorials.json` (`groups[].videos[]`, with `id`, `title`, `desc`, `url`, `length`). Groups with no videos are hidden.
