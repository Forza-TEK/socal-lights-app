#!/bin/sh
# Prints width x height, duration, size of each mp4 given: sh durs.sh a.mp4 b.mp4
for f in "$@"; do
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height:format=duration,size -of csv=p=0:s=x "$f" | tr '\n' ' '
  echo "$f"
done
