"""Runs check.py on all nine owner-recording cuts and prints markdown tables for the README (loudness, durations, transcript match, sync).
Usage: python3 check-all.py <ad-assets dir> <WORK dir> <vosk model dir>"""
import sys, json, subprocess, os
root, work, model = sys.argv[1:4]
V = {"a06": ("a06-add-home-video", "a06-add-home"), "a07": ("a07-route-video", "a07-route"), "a08": ("a08-find-location-video", "a08-find-location"), "a09": ("a09-favorites-video", "a09-favorites")}
here = os.path.dirname(os.path.abspath(__file__))
rows, sync_rows = [], []
for vid, (folder, stem) in V.items():
    for place, tag in (("feed", "4x5"), ("story", "9x16"), ("reel", "9x16")):
        f = f"{root}/{folder}/{stem}-{place}-{tag}.mp4"
        r = subprocess.run(["python3", "-I", here + "/check.py", f, f"{work}/{vid}-{place}-sync.json", model], capture_output=True, text=True)
        d = json.loads(r.stdout)
        size = os.path.getsize(f) / 1e6
        ok_dur = abs(d["video_dur"] - d["audio_dur"]) <= 0.04 and float(d["v_start"]) == 0 and float(d["a_start"]) == 0
        rows.append(f"| {vid} {place} | {d['size']} | {d['video_dur']:.2f} / {d['audio_dur']:.2f} s | {'yes' if ok_dur else 'NO'} | {d['LUFS']} | {d['true_peak_dBFS']} | {d['script_words_recognised']} | {size:.2f} MB |")
        for c in d["cues"]:
            off = c["offset_ms"]
            sync_rows.append(f"| {vid} {place} | {c['cue']} | {c['asr_start']} | {c['action_s'] if c['action_s'] is not None else 'no on-screen cue'} | {off if off is not None else '-'} | {'-' if off is None else ('PASS' if -100 <= off <= 400 else 'FAIL')} |")
        rows[-1] += ""
        print("TRANSCRIPT", vid, place, "|", d["heard"], file=sys.stderr)
print("| Cut | Size | Video / audio duration | Streams aligned (start 0, within 40 ms) | LUFS | True peak dBFS | Script words recognised | File |\n|---|---|---|---|---|---|---|---|")
print("\n".join(rows))
print("\n| Cut | Cue (narration) | Spoken at (ASR, s) | On-screen action (s) | Action minus words (ms) | Result (target -100 to +400) |\n|---|---|---|---|---|---|")
print("\n".join(sync_rows))
