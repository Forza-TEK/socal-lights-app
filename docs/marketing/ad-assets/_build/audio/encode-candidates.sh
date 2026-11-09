#!/bin/sh
# Loudness-normalises (-16 LUFS, true peak -1.5 dBTP) the three rendered candidate wavs and encodes MP3 192k.
# Usage: sh encode-candidates.sh <dir with the three .wav files>   (run make_candidates.py first)
cd "$(dirname "$0")" || exit 1
mkdir -p candidates
for n in A-bright-bells-pop B-swing-along C-cozy-sparkle; do
  ffmpeg -v error -y -i "$1/$n.wav" -t 25 -af "loudnorm=I=-16:TP=-1.5:LRA=7" -ar 48000 -b:a 192k "candidates/$n.mp3"
  echo "$n $(ffmpeg -hide_banner -i candidates/$n.mp3 -af ebur128=peak=true -f null - 2>&1 | grep -E 'I:|Peak:' | tail -2 | tr -s ' ' | tr '\n' ' ') dur $(ffprobe -v error -show_entries format=duration -of csv=p=0 candidates/$n.mp3)"
done
