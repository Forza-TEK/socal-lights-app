#!/bin/bash
# Re-records videos with the Kokoro voice and the fuller narration: the computer version, then the phone version of each.
# Usage: scripts/tutorials/supervisor-voice.sh <id> <id> ...     (skips ids already in $S/voice.done / $S/voice-m.done)
# Relaunch any time:  setsid nohup scripts/tutorials/supervisor-voice.sh ids... > /tmp/sv.log 2>&1 &
cd /home/user/socal-lights-app
S=${S:-/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad}
export TTS_ENGINE=kokoro KOKORO_VOICE=af_heart
declare -A FILE=([map]=find-map [night]=find-night [email]=find-email [app]=find-app [contests]=find-contests [pro-filter]=find-pro [custom]=run-custom [share]=run-share [approve]=run-approve [edit]=run-edit [voting]=run-voting [team]=run-team [announce]=run-announce [activity]=run-activity [sponsors]=sponsors-add [installer]=sponsors-installer [installer-profile]=sponsors-profile [enter]=enter [edit-entry]=edit-entry [profile]=profile [vote]=vote [judge]=judge [add-event]=post-event [showcase]=post-house [quick]=run-quick)
touch $S/voice.done $S/voice-m.done
for round in 1 2 3; do
  for id in "$@"; do
    f=${FILE[$id]}
    if ! grep -qx "$id" $S/voice.done; then
      res=$(scripts/tutorials/rec1.sh $id 2>&1 | tail -4); echo "$res"
      if echo "$res" | grep -q " length " && ! echo "$res" | grep -q "QA FAILED"; then echo $id >> $S/voice.done; echo "$(date +%T) done $id" >> $S/voice-status.txt; else echo "$(date +%T) FAILED $id (desktop, round $round)" >> $S/voice-status.txt; echo "$res" > $S/work/last-failure-$id.txt; fi
    fi
    if grep -qx "$id" $S/voice.done && ! grep -qx "$id" $S/voice-m.done; then
      res=$(MOBILE=1 scripts/tutorials/rec1.sh $id 2>&1 | tail -4); echo "$res"
      if echo "$res" | grep -q " length " && ! echo "$res" | grep -q "QA FAILED"; then echo $id >> $S/voice-m.done; echo "$(date +%T) done $id (phone)" >> $S/voice-status.txt; else echo "$(date +%T) FAILED $id (phone, round $round)" >> $S/voice-status.txt; echo "$res" > $S/workm/last-failure-$id.txt; fi
    fi
  done
done
echo "$(date +%T) VOICE RUN FINISHED" >> $S/voice-status.txt
