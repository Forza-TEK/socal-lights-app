#!/bin/sh
# Re-renders the nine owner-recording ad cuts (a07, a08, a09 x feed, story, reel) with the music assigned to each video.
# Usage: WORK=<scratch dir> TTS=<narration wav dir> sh remix-all.sh                      (default mapping below)
#        WORK=... TTS=... sh remix-all.sh a08 <track.mp3>                                (re-mix ONE video with another track)
# Mapping chosen by the owner: a08 = A Bright bells pop, a09 = C Cozy sparkle, a07 = B Swing-along (a06 = A when it exists).
# Same ducking (-8 dB under the voice), loudness (-14 LUFS, true peak below -1 dBTP), fade-out and sync checks for every track.
C="$(dirname "$0")/audio/candidates"
run() { for p in feed story reel; do node owner-cut.mjs "$1" $p --music "$2"; done; }
if [ -n "$1" ]; then run "$1" "$2"; exit; fi
run a06 "$C/A-bright-bells-pop.mp3"
run a08 "$C/A-bright-bells-pop.mp3"
run a09 "$C/C-cozy-sparkle.mp3"
run a07 "$C/B-swing-along.mp3"
