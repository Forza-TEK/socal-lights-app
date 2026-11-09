#!/bin/sh
# Re-renders all nine owner-recording ad cuts (a07, a08, a09 x feed, story, reel) with a different music bed.
# Usage: WORK=<scratch dir> TTS=<narration wav dir> sh remix-all.sh [<music file>]
# Same ducking (-8 dB under the voice), loudness (-14 LUFS, true peak below -1 dBTP), fade-out and sync checks; no argument = the original synthesized track.
M=""
[ -n "$1" ] && M="--music $1"
for v in a07 a08 a09; do for p in feed story reel; do node owner-cut.mjs $v $p $M; done; done
