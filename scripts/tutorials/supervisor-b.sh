#!/bin/bash
# Second recorder: same job as supervisor.sh, but on its own test server (port 8789) and its own demo database, working from the END of the list,
# so two videos record at once. It skips a video the first recorder is already doing. Relaunch any time.
cd /home/user/socal-lights-app
S=${S:-/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad}
PORT=8789; P=/tmp/state2; PER="--persist-to $P"
export BASE=http://localhost:$PORT PLAYWRIGHT_PATH=/usr/local/lib/node_modules_global/playwright VOICE=$S/voice/en_US-hfc_female-medium.onnx COOKIES=$S/demo/cookies.json WORK=$S/work-b OUT=$S/out LOGO=$S/assets/oak-hill-hardware.png LENGTH_SCALE=1.15
mkdir -p $WORK
IDS="showcase add-event judge vote profile edit-entry enter installer-profile installer sponsors activity announce team voting edit approve share custom pro-filter map night"
DONE=$S/batch.done; touch $DONE
declare -A FILE=([map]=find-map [night]=find-night [pro-filter]=find-pro [custom]=run-custom [share]=run-share [approve]=run-approve [edit]=run-edit [voting]=run-voting [team]=run-team [announce]=run-announce [activity]=run-activity [sponsors]=sponsors-add [installer]=sponsors-installer [installer-profile]=sponsors-profile [enter]=enter [edit-entry]=edit-entry [profile]=profile [vote]=vote [judge]=judge [add-event]=post-event [showcase]=post-house)
server() {
  curl -s -o /dev/null -m 4 localhost:$PORT/ && return 0
  (setsid nohup npx wrangler pages dev public --port $PORT $PER > /tmp/dev-b.log 2>&1 &)
  for i in $(seq 1 30); do curl -s -o /dev/null -m 3 localhost:$PORT/ && return 0; sleep 3; done
  return 1
}
for round in 1 2 3; do
  for id in $IDS; do
    grep -qx "$id" $DONE && continue
    ps -eo args | grep "videos2.mjs $id\$" | grep -v grep >/dev/null && continue   # the other recorder is on it
    server || { echo "server would not start"; continue; }
    npx wrangler d1 execute socal-lights --local $PER --file $S/demo/seed.sql >/dev/null 2>&1
    [ "$id" = "announce" ] && npx wrangler d1 execute socal-lights --local $PER --file $S/demo/judged.sql >/dev/null 2>&1
    [ "$id" = "installer" ] && npx wrangler d1 execute socal-lights --local $PER --file scripts/tutorials/seed-installer.sql >/dev/null 2>&1
    echo "== B round $round: $id"
    res=$(node scripts/tutorials/videos2.mjs $id 2>&1 | grep -v "^\s*at \|Warning\|Reparsing\|To eliminate\|trace-warnings" | tail -6)
    echo "$res"
    if echo "$res" | grep -q " length " && ! echo "$res" | grep -q "QA FAILED"; then
      echo "$id" >> $DONE; echo "$(TZ=America/Los_Angeles date +%H:%M) [B] done $id" >> $S/status.txt
    else
      echo "$(TZ=America/Los_Angeles date +%H:%M) [B] FAILED $id (round $round)" >> $S/status.txt; echo "$res" > $S/work-b/last-failure-$id.txt
    fi
  done
  left=$(for id in $IDS; do grep -qx "$id" $DONE || echo $id; done | tr '\n' ' '); [ -z "$left" ] && break
done
echo "$(TZ=America/Los_Angeles date +%H:%M) [B] FINISHED. Not done: ${left:-none}" | tee -a $S/status.txt
