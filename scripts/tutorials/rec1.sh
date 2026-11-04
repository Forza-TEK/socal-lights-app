#!/bin/bash
# Record one video (desktop, or the phone version when MOBILE=1), restarting the local server and re-seeding the demo data first.
# Usage: [MOBILE=1] [VOICE_NAME=...] scripts/tutorials/rec1.sh <id>...
cd /home/user/socal-lights-app
S=${S:-/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad}
PORT=${PORT:-8788}; SUF=""; PERSIST=""; [ "$PORT" != "8788" ] && { SUF="-$PORT"; PERSIST="--persist-to /tmp/state-$PORT"; export BASE=http://localhost:$PORT; }
OUTD=$S/out; WORKD=$S/work$SUF; [ "$MOBILE" = "1" ] && { OUTD=$S/outm; WORKD=$S/workm$SUF; }
export PLAYWRIGHT_PATH=/usr/local/lib/node_modules_global/playwright VOICE=$([ "$TTS_ENGINE" = "kokoro" ] && echo $S/kokoro || echo ${VOICE:-$S/voice/en_US-hfc_female-medium.onnx}) COOKIES=$S/demo/cookies.json WORK=$WORKD OUT=$OUTD LOGO=$S/assets/oak-hill-hardware.png LENGTH_SCALE=${LENGTH_SCALE:-1.15} MOBILE=${MOBILE:-0}
mkdir -p $OUTD $WORKD
for id in "$@"; do
  curl -s -o /dev/null -m 4 localhost:$PORT/ || { (setsid nohup npx wrangler pages dev public --port $PORT $PERSIST > /tmp/dev-$PORT.log 2>&1 &); for i in $(seq 1 30); do curl -s -o /dev/null -m 3 localhost:$PORT/ && break; sleep 3; done; }
  npx wrangler d1 execute socal-lights --local $PERSIST --file $S/demo/seed.sql >/dev/null 2>&1
  [ "$id" = "announce" ] && npx wrangler d1 execute socal-lights --local $PERSIST --file $S/demo/judged.sql >/dev/null 2>&1
  [ "$id" = "installer" ] && npx wrangler d1 execute socal-lights --local $PERSIST --file scripts/tutorials/seed-installer.sql >/dev/null 2>&1
  echo "== $id"; node scripts/tutorials/videos2.mjs $id 2>&1 | grep -v "^\s*at \|Warning\|Reparsing\|To eliminate\|trace-warnings" | tail -5
done
