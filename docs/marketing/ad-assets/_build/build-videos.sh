#!/bin/sh
# Builds the Feed (4:5), Story (9:16) and Reel (9:16) cuts of the phone videos from the recordings in $WORK.
# Usage: WORK=<dir> [CLS=0.35] [CLR=0.5] sh build-videos.sh <id> <dirname> <stem> [crop]
#   e.g.  WORK=/tmp/x sh build-videos.sh a09 a09-favorites-video a09-favorites crop
# "crop" = take the 4:5 feed cut from the 9:16 recording (bottom 1350 rows) instead of a separate 4:5 recording.
# CLS / CLR = longest still frame kept (seconds) for the feed and Story cuts / for the Reel core: stalls are shortened to this.
A="$(cd .. && pwd)/"
ID=$1; D=$A$2; S=$3
mkdir -p "$D"
export CL="${CLS:-0.35}"
if [ "$4" = "crop" ]; then CROP45=1 node compose.mjs "$ID" "$D" "$S" 45; else node compose.mjs "$ID" "$D" "$S" 45; fi
node compose.mjs "$ID" "$D" "$S" 916
# Reel: longer core (up to 15 s), then a held last frame and the plain end card
CL="${CLR:-0.5}" CAP=15 OUTSUFFIX=reelcore-9x16 node compose.mjs "$ID" "$WORK" "$S" 916
node reel.mjs "$WORK/$S-reelcore-9x16.mp4" "$D/$S-reel-9x16.mp4" "$WORK/endcard.png"
