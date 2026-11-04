#!/bin/bash
# Makes each video's thumbnail (.jpg) from its very first frame (the title card). Usage: scripts/tutorials/thumbs.sh <dir>
for f in "$1"/*.mp4; do ffmpeg -v error -y -ss 0 -i "$f" -frames:v 1 -q:v 3 "${f%.mp4}.jpg"; done
