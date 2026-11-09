"""Mixes narration clips and the original festive track into one stereo 48 kHz wav, ducking the music under the voice.
Usage: python3 mix.py <spec.json> <out.wav> <music.wav>
spec.json = {"total": seconds, "clips": [{"wav": path, "start": seconds}, ...], "report": path}
Levels: voice speech RMS about -22 dBFS; music alone sits 10 dB below the voice, 18 dB below it while the voice speaks
(8 dB duck, 100 ms smoothing, starts 100 ms before and ends 200 ms after each clip). Last 1.2 s fades out.
The result is loudness-normalised afterwards by ffmpeg loudnorm (-14 LUFS integrated, true peak below -1 dBTP)."""
import sys, json
import numpy as np, soundfile as sf
SR = 48000
spec = json.load(open(sys.argv[1])); total = spec["total"]
n = int(round(total * SR))
voice = np.zeros((n, 2)); env = np.zeros(n)
def to_sr(x, sr):
    if sr == SR: return x
    t = np.arange(int(len(x) * SR / sr)) / SR
    return np.interp(t, np.arange(len(x)) / sr, x)
rms_ref = 10 ** (-22 / 20)
for c in spec["clips"]:
    x, sr = sf.read(c["wav"], dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    x = to_sr(x, sr)
    act = x[np.abs(x) > 0.02]
    x = x * (rms_ref / max(1e-6, np.sqrt(np.mean(act ** 2))))
    x *= np.minimum(1, np.arange(len(x)) / (SR * .01)) * np.minimum(1, (len(x) - np.arange(len(x))) / (SR * .02))  # 10 ms in, 20 ms out
    i = int(round(c["start"] * SR)); j = min(n, i + len(x))
    voice[i:j, 0] += x[: j - i]; voice[i:j, 1] += x[: j - i]
    a = max(0, i - int(.1 * SR)); b = min(n, i + len(x) + int(.2 * SR)); env[a:b] = 1
k = int(.1 * SR); env = np.convolve(env, np.ones(k) / k, mode="same")
m, sr = sf.read(sys.argv[3], dtype="float32")
if m.ndim == 1: m = np.stack([m, m], 1)
mm = np.zeros((n, 2)); L = min(n, len(m)); mm[:L] = m[:L]
music_rms = np.sqrt(np.mean(mm[: min(n, int(20 * SR))] ** 2))
mm *= (rms_ref * 10 ** (-10 / 20)) / max(1e-6, music_rms)
mm *= (10 ** (-8 / 20)) ** env[:, None]
mix = voice + mm
fo = np.clip((n - np.arange(n)) / (SR * 1.2), 0, 1); mix *= fo[:, None]
pk = np.max(np.abs(mix)); mix *= min(1, 0.89 / pk) if pk > 0.89 else 1
sf.write(sys.argv[2], mix.astype(np.float32), SR, subtype="FLOAT")
json.dump({"duck_windows": [[round(c["start"] - .1, 3), round(c["start"] + c.get("dur", 0) + .2, 3)] for c in spec["clips"]], "peak": float(np.max(np.abs(mix)))}, open(spec["report"], "w"))
