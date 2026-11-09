"""Checks a finished ad video: stream durations, loudness (ebur128), peak, and a speech-recognition transcript (vosk, small English model).
Usage: python3 check.py <video.mp4> <sync.json> <vosk-model-dir> [script words...]
Prints one JSON object: durations, loudness, transcript with word start times, and the match against the intended script."""
import sys, json, subprocess, re, types, wave
sys.modules.setdefault("srt", types.ModuleType("srt"))
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
v, syncf, model = sys.argv[1], sys.argv[2], sys.argv[3]
sync = json.load(open(syncf))
def run(*a): return subprocess.run(a, capture_output=True, text=True)
pr = run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,duration,start_time,r_frame_rate,sample_rate,channels,width,height", "-of", "json", v)
st = json.loads(pr.stdout)["streams"]
vs = [s for s in st if s["codec_type"] == "video"][0]; au = [s for s in st if s["codec_type"] == "audio"][0]
eb = run("ffmpeg", "-hide_banner", "-i", v, "-af", "ebur128=peak=true", "-f", "null", "-").stderr
I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)[-1]); TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", eb)[-1])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", v, "-ac", "1", "-ar", "16000", "/tmp/_asr.wav"])
w = wave.open("/tmp/_asr.wav"); rec = KaldiRecognizer(Model(model), 16000); rec.SetWords(True)
words = []
while True:
    d = w.readframes(4000)
    if not d: break
    if rec.AcceptWaveform(d): words += json.loads(rec.Result()).get("result", [])
words += json.loads(rec.FinalResult()).get("result", [])
heard = " ".join(x["word"] for x in words)
intended = " ".join(c["cue"] for c in sync["sync"]).lower()
norm = lambda s: re.sub(r"[^a-z ]", "", s.lower()).split()
iw, hw = norm(intended), norm(heard)
hits = sum(1 for x in iw if x in hw)
# measured narration start of each cue = start time of its first recognised word
meas = []
for c in sync["sync"]:
    fw = norm(c["cue"])[0]
    if fw == "socal": fw = "lights"  # the small recogniser hears "so cow"; "lights" is reliable
    cand = [x for x in words if x["word"] == fw and x["start"] >= c["narration_start_s"] - 0.6]
    ms = cand[0]["start"] if cand else None
    meas.append({"cue": c["cue"], "planned_start": c["narration_start_s"], "asr_start": ms, "action_s": c["action_s"],
                 "offset_ms": None if (ms is None or c["action_s"] is None) else round((c["action_s"] - ms) * 1000)})
print(json.dumps({"file": v, "video_dur": float(vs["duration"]), "audio_dur": float(au["duration"]), "v_start": vs["start_time"], "a_start": au["start_time"], "fps": vs["r_frame_rate"], "size": f'{vs["width"]}x{vs["height"]}', "audio": f'{au["codec_name"]} {au["sample_rate"]} Hz {au["channels"]}ch',
                  "LUFS": I, "true_peak_dBFS": TP, "heard": heard, "script_words_recognised": f"{hits}/{len(iw)}", "cues": meas}, indent=1))
