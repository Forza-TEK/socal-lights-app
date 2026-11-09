#!/bin/sh
# Contact sheet of an ad video for review: sheet.sh <video.mp4> <out.png> [cols]  (6 frames spread over the video)
V="$1"; O="$2"; D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
ffmpeg -v error -y -i "$V" -vf "fps=6/$D,scale=360:-1,tile=${3:-6}x1" -frames:v 1 "$O"
