#!/bin/sh
# Records every phone video in both frame sizes: WORK=<dir> sh runall.sh a07 a08 a09
for a in "$@"; do for f in 916 45; do FMT=$f node scenarios.mjs $a; done; done
