#!/bin/sh
# Dense contact sheet for privacy review: 2 frames per second, 6 columns. sheet2.sh <video.mp4> <out.png> [scaleWidth]
ffmpeg -v error -y -i "$1" -vf "fps=2,scale=${3:-300}:-1,tile=6x4" -frames:v 1 "$2"
