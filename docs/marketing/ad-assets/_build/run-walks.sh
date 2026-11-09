#!/bin/sh
# Records the walkthroughs one after another: WORK=<dir> TTS=<dir> sh run-walks.sh w09 w07 w06 w08
# (clears the local submit limit and earlier demo homes first, so the add-a-home flow can be recorded again)
cd "$(dirname "$0")" || exit 1
for w in "$@"; do
  if [ "$w" = "w06" ]; then
    /home/user/socal-lights-app/node_modules/.bin/wrangler d1 execute socal-lights --local --persist-to "$WORK/../state" --command "DELETE FROM submit_log; DELETE FROM posts WHERE title='Sample Family Lights'" > /dev/null 2>&1
  fi
  node walk.mjs "$w" || echo "FAILED $w"
done
