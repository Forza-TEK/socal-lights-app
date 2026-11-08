#!/bin/bash
# Relaunch both re-recording chains (computer + phone version of each video). Finished ids are skipped, so it is safe to run any time.
# Round 4 (2026-11-08, after the Help and Tutorials audit): chain A on port 8788, chain B on port 8789, each with its own database copy in /tmp/state-<port>.
cd /home/user/socal-lights-app
export TTS_ENGINE=kokoro KOKORO_VOICE=af_heart
pgrep -f "supervisor-voice.sh map " >/dev/null || (setsid nohup scripts/tutorials/supervisor-voice.sh map night email app contests pro-filter > /tmp/sv-a.log 2>&1 &)
pgrep -f "supervisor-voice.sh enter " >/dev/null || (PORT=8789 setsid nohup scripts/tutorials/supervisor-voice.sh enter edit-entry profile vote judge > /tmp/sv-b.log 2>&1 &)
