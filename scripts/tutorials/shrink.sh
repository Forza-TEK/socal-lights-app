#!/bin/bash
# Re-encodes finished tutorial mp4s to the size the site serves (owner decision, PR 697): H.264 CRF 27, preset slow, yuv420p, faststart,
# AAC 64k. Computer videos are at most 1280x720; phone videos (name ends -mobile.mp4) are 720 wide (720x1280).
# Usage: scripts/tutorials/shrink.sh public/tutorials/<name>.mp4 ...      (files are replaced in place)
set -e
for f in "$@"; do
  case "$f" in *-mobile.mp4) vf="scale=720:-2:flags=lanczos,fps=30" ;; *) vf="scale=1280:-2:flags=lanczos,fps=30" ;; esac
  t="$(dirname "$f")/.shrink-$(basename "$f")"
  ffmpeg -v error -y -i "$f" -vf "$vf" -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 64k "$t"
  mv "$t" "$f"; echo "$(basename "$f") $(du -h "$f" | cut -f1)"
done
