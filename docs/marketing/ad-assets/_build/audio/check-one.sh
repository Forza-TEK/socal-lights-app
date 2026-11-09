#!/bin/sh
# Checks the three cuts of one video: sh check-one.sh <id> <folder> <stem> <ad-assets dir> <WORK dir> <vosk model dir>
# Prints durations, LUFS, true peak, the ASR transcript and per-cue offsets for feed, story and reel.
here="$(cd "$(dirname "$0")" && pwd)"
for pair in feed:4x5 story:9x16 reel:9x16; do
  p=${pair%%:*}; t=${pair##*:}
  python3 -I "$here/check.py" "$4/$2/$3-$p-$t.mp4" "$5/$1-$p-sync.json" "$6" | python3 -I -c "
import json,sys
d=json.load(sys.stdin)
print('$1 $p', d['size'], round(d['video_dur'],2), round(d['audio_dur'],2), 'LUFS', d['LUFS'], 'TP', d['true_peak_dBFS'], 'words', d['script_words_recognised'])
print('  heard:', d['heard'])
for c in d['cues']: print('  ', c['cue'][:40], 'asr', c['asr_start'], 'action', c['action_s'], 'offset_ms', c['offset_ms'])"
done
