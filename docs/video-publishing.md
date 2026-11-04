# Publishing the tutorial videos to YouTube, Instagram and Facebook

Every video has two versions. The file list, titles, descriptions, hashtags and caption files for every upload are in `docs/video-metadata.csv` (rebuild it any time with `node scripts/tutorials/publish-kit.mjs`). The video files are in `public/tutorials/` (and on the live site at `https://socallights.app/tutorials/<name>.mp4`).

| Version | Files | Where it goes |
|---|---|---|
| **Computer** (16:9, 2560 x 1440, 1 to 2.5 minutes) | `<name>.mp4`, `<name>.vtt`, `<name>.jpg` | YouTube (normal videos, one playlist per group); Facebook page video |
| **Phone** (9:16, 1080 x 1920) | `<name>-mobile.mp4`, `<name>-mobile.vtt`, `<name>-mobile.jpg` | YouTube Shorts, Instagram Reels, Facebook Reels |

## Format notes (third-party sources; confirm on each platform's own help page before the first upload)
- All three short-video formats want 9:16 at 1080 x 1920, MP4. Our phone files match.
- YouTube Shorts are listed as up to 3 minutes. Instagram Reels and Facebook Reels limits are reported differently by different guides, and reels longer than about 3 minutes are not recommended to new viewers. Our longest phone video (Customize) is 2:23, the rest are under 2 minutes. If a platform rejects one, post the computer version there instead.
- YouTube accepts caption files in Studio under Subtitles, Add, Upload file, With timing. Both `.vtt` and `.srt` are reported as accepted. If a file is refused, convert it: `ffmpeg -i name.vtt name.srt`.
- Instagram Reels does not take a caption file; turn on its automatic captions in the editor. Our phone videos already show the step captions ("Tap Allow") on screen. Keep any text of your own clear of the top 10 percent and bottom 20 percent, where the apps put their buttons.
- Facebook video can take a `.srt` caption file in Meta Business Suite (convert from `.vtt` as above).

## Suggested channel setup (YouTube)
- Channel name: SoCal Lights. Banner and picture: the round SoCal Lights badge.
- Six playlists named like the Tutorials page groups: Find and plan, Enter a home, Vote and judge, Run a contest, Sponsors and installers, Post events and homes.
- Title pattern: `<what you will do> | SoCal Lights` (already in the CSV). First line of every description: what the video shows. Second: the link `https://socallights.app/tutorials#v-<id>`. Then the contact line.
- Pin a comment on each video: "Questions? Email info@socallights.app".
- Upload the computer versions as normal videos and the phone versions as Shorts (add `#Shorts` in the title or description, already in the CSV).
- Use the `.jpg` as the thumbnail for the computer versions. Shorts take a frame from the video.

## After uploading
- Paste each YouTube link into `public/tutorials.json` as a `youtube` field if you want the Tutorials page to offer "Watch on YouTube" (not built yet; ask for it).
- Moving the video files out of the repository to YouTube or Cloudflare Stream would also stop each deploy from carrying about 500 MB. Ask when you want that done.

## Re-recording after a feature change
`docs/tutorials.md` explains the recorder. One video takes about 2 to 5 minutes to record. Change the script wording in `scripts/tutorials/videos.mjs` or `videos2.mjs`, record it, install it, and re-upload (YouTube lets you replace the file only by uploading a new video, so keep the old link in the playlist until the new one is live).
