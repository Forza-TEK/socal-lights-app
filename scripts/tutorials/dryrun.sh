#!/bin/bash
# Fast check of every remaining video: walks each step (no voice, no video) and reports the first thing that is missing.
# Usage: scripts/tutorials/dryrun.sh id id ...      Results: $S/dry.txt
cd /home/user/socal-lights-app
S=${S:-/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad}
export PLAYWRIGHT_PATH=/usr/local/lib/node_modules_global/playwright VOICE=x COOKIES=$S/demo/cookies.json WORK=$S/dry OUT=$S/dry LOGO=$S/assets/oak-hill-hardware.png DRY=1
mkdir -p $S/dry; : > $S/dry.txt
for id in "$@"; do
  curl -s -o /dev/null -m 4 localhost:8788/ || { (setsid nohup npx wrangler pages dev public --port 8788 > /tmp/dev.log 2>&1 &); for i in $(seq 1 30); do curl -s -o /dev/null -m 3 localhost:8788/ && break; sleep 3; done; }
  npx wrangler d1 execute socal-lights --local --file $S/demo/seed.sql >/dev/null 2>&1
  [ "$id" = "announce" ] && npx wrangler d1 execute socal-lights --local --file $S/demo/judged.sql >/dev/null 2>&1
  [ "$id" = "installer" ] && npx wrangler d1 execute socal-lights --local --file scripts/tutorials/seed-installer.sql >/dev/null 2>&1
  res=$(timeout 240 node scripts/tutorials/videos2.mjs $id 2>&1 | grep -v "^\s*at \|Warning\|Reparsing\|To eliminate\|trace-warnings" | tail -5 | tr '\n' ' ')
  echo "$id :: $res" | cut -c1-260 >> $S/dry.txt
done
echo "DRYRUN FINISHED" >> $S/dry.txt
