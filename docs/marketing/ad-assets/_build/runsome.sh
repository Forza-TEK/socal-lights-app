#!/bin/sh
# runsome.sh a09:916 a07:916 a07:45 ...  (WORK=<dir>)
for x in "$@"; do FMT=${x#*:} node scenarios.mjs ${x%%:*}; done
