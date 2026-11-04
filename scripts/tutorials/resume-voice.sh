#!/bin/bash
# Relaunch both voice re-recording chains (computer + phone for each video). Finished ids are skipped, so it is safe to run any time.
cd /home/user/socal-lights-app
ps -eo args | grep -q "[s]upervisor-voice.sh share" || (setsid nohup scripts/tutorials/supervisor-voice.sh quick custom share approve edit voting team announce activity sponsors installer installer-profile add-event showcase > /tmp/sv-a.log 2>&1 &)
ps -eo args | grep -q "[s]upervisor-voice.sh map" || (PORT=8789 setsid nohup scripts/tutorials/supervisor-voice.sh map night email app contests pro-filter enter edit-entry profile vote judge > /tmp/sv-b.log 2>&1 &)
