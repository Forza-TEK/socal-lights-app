#!/bin/bash
# Fast check of videos: walks each step (no voice, no video), saves a screenshot of every step, and reports the first thing that is missing.
# Usage: [MOBILE=1] [PORT=8788] scripts/tutorials/dryrun.sh id id ...      Results: $S/dry-<port>[-m].txt   Screenshots: $S/dry<port>[m]/<id>/sNN.png
cd /home/user/socal-lights-app
S=${S:-/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad}
PORT=${PORT:-8788}; M=""; [ "$MOBILE" = "1" ] && M="m"; DEMO=${DEMO:-$S/demo2}; PERSIST="--persist-to /tmp/state-$PORT"; export BASE=http://localhost:$PORT STATE_DIR=/tmp/state-$PORT
export PLAYWRIGHT_PATH=/usr/local/lib/node_modules_global/playwright VOICE=x COOKIES=$DEMO/cookies.json WORK=$S/dry$PORT$M OUT=$S/dry$PORT$M LOGO=$S/assets/oak-hill-hardware.png DRY=1 SHOTS=1 MOBILE=${MOBILE:-0}
mkdir -p $WORK; R=$S/dry-$PORT${M:+-m}.txt; : > $R
for id in "$@"; do
  curl -s -o /dev/null -m 4 localhost:$PORT/ || { (setsid nohup npx wrangler pages dev public --port $PORT --inspector-port $((PORT+1000)) $PERSIST > /tmp/dev-$PORT.log 2>&1 &); for i in $(seq 1 30); do curl -s -o /dev/null -m 3 localhost:$PORT/ && break; sleep 3; done; }
  npx wrangler d1 execute socal-lights --local $PERSIST --file $DEMO/seed.sql >/dev/null 2>&1
  [ "$id" = "announce" ] && npx wrangler d1 execute socal-lights --local $PERSIST --file $DEMO/judged.sql >/dev/null 2>&1
  [ "$id" = "feature" ] && npx wrangler d1 execute socal-lights --local $PERSIST --file scripts/tutorials/seed-feature.sql >/dev/null 2>&1
  [ "$id" = "installer" ] && npx wrangler d1 execute socal-lights --local $PERSIST --file scripts/tutorials/seed-installer.sql >/dev/null 2>&1
  [ "$id" = "add-homes" -o "$id" = "approve" ] && npx wrangler d1 execute socal-lights --local $PERSIST --file scripts/tutorials/seed-add-homes.sql >/dev/null 2>&1
  mkdir -p $S/dry-logs; L=$S/dry-logs/$id-$PORT$M.log
  timeout 300 node scripts/tutorials/videos2.mjs $id > $L 2>&1
  res=$(grep -E "dry run OK|Error|waiting for|showed an error" $L | grep -v "^\s*at " | head -4 | tr '\n' ' ')
  echo "$id :: $res" | cut -c1-600 >> $R
done
echo "DRYRUN FINISHED" >> $R
