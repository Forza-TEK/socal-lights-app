#!/bin/bash
# Re-records a queue of tutorial videos one at a time, checks each, installs it into public/tutorials/ and commits and pushes it
# before starting the next (the container has restarted mid-recording before, so nothing is kept only in /tmp).
# Usage: scripts/tutorials/rerecord-queue.sh "announce:m sponsors:m custom:d map:d ..."     (id:d = computer, id:m = phone)
# Environment (defaults match the 2026-11-08 audit session): S = folder with kokoro/, demo/, assets/, cleanup.sql; SC = scratch folder; PORT = local server port.
# Needs the local server running on $PORT with its own database copy (--persist-to /tmp/state-$PORT) that has all migrations applied.
cd "$(dirname "$0")/../.."
S=${S:-/tmp/claude-0/scratch}; SC=${SC:-/tmp/claude-0/sc}; BR=$(git branch --show-current)
declare -A EXTRA=([approve]="$S/pre.sql" [add-homes]="scripts/tutorials/seed-add-homes.sql" [claim]="$S/claim.sql" [feature]="$S/feature.sql" [profile]="$S/profile.sql" [installer]="scripts/tutorials/seed-installer.sql" [contest-passes]="scripts/tutorials/seed-passes.sql")
STATUS=$SC/queue-status.txt
for task in $1; do
  id=${task%%:*}; kind=${task##*:}; M=0; OUT=$SC/out; INST=install.mjs; [ "$kind" = "m" ] && { M=1; OUT=$SC/outm; INST=install-mobile.mjs; }
  grep -qx "$task" $SC/queue-done.txt 2>/dev/null && continue
  ok=0
  for try in 1 2; do
    echo "$(date +%T) start $task (try $try)" >> $STATUS
    MOBILE=$M TIMING=1 bash $SC/rec.sh $id ${EXTRA[$id]} > $SC/last-$id-$kind.log 2>&1; rm -rf $SC/work/*/frames $SC/workm/*/frames
    if grep -q " length " $SC/full-$id.log && ! grep -q "QA FAILED\|TimeoutError" $SC/full-$id.log; then ok=1; break; fi
    echo "$(date +%T) FAILED $task try $try: $(grep -m1 'QA FAILED\|Error' $SC/full-$id.log | cut -c1-200)" >> $STATUS
  done
  [ $ok = 1 ] || continue
  node scripts/tutorials/$INST $OUT $id >> $STATUS 2>&1
  if node scripts/tutorials/check-sync.mjs $id > $SC/check-$id-$kind.txt 2>&1; then r=PASS; else r=ATTENTION; fi
  git add public/tutorials public/tutorials.json >/dev/null 2>&1
  git commit -q -m "Tutorial re-record: $id ($([ $M = 1 ] && echo phone || echo computer)); sync check $r

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019SjWVroMHGP2PhQTUG27MT" >/dev/null 2>&1
  git push -q origin $BR >/dev/null 2>&1 || echo "$(date +%T) push failed for $task" >> $STATUS
  echo "$task" >> $SC/queue-done.txt; echo "$(date +%T) done $task, sync check $r" >> $STATUS
done
echo "$(date +%T) QUEUE FINISHED" >> $STATUS
