#!/bin/bash
# Records every tutorial video and does not stop until all are done.
# - Survives crashes: progress is kept in $S/batch.done and finished videos are saved into the repo branch as they complete.
# - Restarts the local server and re-seeds the demo data before every video.
# - Retries each video, up to 4 rounds. Status is written to $S/status.txt.
# Relaunch it any time (it skips finished videos):  setsid nohup scripts/tutorials/supervisor.sh > /tmp/supervisor.log 2>&1 &
cd /home/user/socal-lights-app
S=${S:-/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad}
export PLAYWRIGHT_PATH=/usr/local/lib/node_modules_global/playwright VOICE=$S/voice/en_US-hfc_female-medium.onnx COOKIES=$S/demo/cookies.json WORK=$S/work OUT=$S/out LOGO=$S/assets/oak-hill-hardware.png LENGTH_SCALE=1.15
IDS="map night email app contests pro-filter custom share approve edit voting team announce activity sponsors installer installer-profile enter edit-entry profile vote judge add-event showcase"
DONE=$S/batch.done; touch $DONE
declare -A FILE=([map]=find-map [night]=find-night [email]=find-email [app]=find-app [contests]=find-contests [pro-filter]=find-pro [custom]=run-custom [share]=run-share [approve]=run-approve [edit]=run-edit [voting]=run-voting [team]=run-team [announce]=run-announce [activity]=run-activity [sponsors]=sponsors-add [installer]=sponsors-installer [installer-profile]=sponsors-profile [enter]=enter [edit-entry]=edit-entry [profile]=profile [vote]=vote [judge]=judge [add-event]=post-event [showcase]=post-house [quick]=run-quick)
server() {
  curl -s -o /dev/null -m 4 localhost:8788/ && return 0
  (setsid nohup npx wrangler pages dev public --port 8788 > /tmp/dev.log 2>&1 &)
  for i in $(seq 1 30); do curl -s -o /dev/null -m 3 localhost:8788/ && return 0; sleep 3; done
  return 1
}
save() { # keep a finished video in the repo branch, so a lost container cannot lose it
  f=${FILE[$1]}; mkdir -p public/tutorials/_review
  cp $S/out/$f.mp4 $S/out/$f.vtt $S/out/$f.jpg public/tutorials/_review/ 2>/dev/null
  git add public/tutorials/_review >/dev/null 2>&1
  git commit -q -m "Review copy: $1 video" >/dev/null 2>&1
  git push -q origin claude/sharp-keller-zmygil >/dev/null 2>&1 || true
}
for round in 1 2 3 4; do
  for id in $IDS; do
    grep -qx "$id" $DONE && continue
    server || { echo "server would not start"; continue; }
    npx wrangler d1 execute socal-lights --local --file $S/demo/seed.sql >/dev/null 2>&1
    [ "$id" = "announce" ] && npx wrangler d1 execute socal-lights --local --file $S/demo/judged.sql >/dev/null 2>&1
    [ "$id" = "installer" ] && npx wrangler d1 execute socal-lights --local --file scripts/tutorials/seed-installer.sql >/dev/null 2>&1
    echo "== round $round: $id"
    res=$(node scripts/tutorials/videos2.mjs $id 2>&1 | grep -v "^\s*at \|Warning\|Reparsing\|To eliminate\|trace-warnings" | tail -6)
    echo "$res"
    if echo "$res" | grep -q " length " && ! echo "$res" | grep -q "QA FAILED"; then
      echo "$id" >> $DONE; save $id; echo "$(date +%T) done $id" >> $S/status.txt
    else
      echo "$(date +%T) FAILED $id (round $round)" >> $S/status.txt; echo "$res" > $S/work/last-failure-$id.txt
    fi
  done
  left=$(for id in $IDS; do grep -qx "$id" $DONE || echo $id; done | tr '\n' ' ')
  [ -z "$left" ] && break
done
echo "$(date +%T) SUPERVISOR FINISHED. Not done: ${left:-none}" | tee -a $S/status.txt
