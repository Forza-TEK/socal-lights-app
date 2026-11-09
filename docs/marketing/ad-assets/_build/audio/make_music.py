"""Original festive track for the ads, generated with numpy only (no samples, no third-party recording).
Melody: the public-domain carol "Jingle Bells" (composed 1857), played by synthesised glockenspiel bells; our own arrangement:
warm pad, light bass, sleigh-bell shaker. 110 BPM, C major, about 24 s, one-bar intro, decaying clean tail, loopable.
Usage: python3 make_music.py <out.wav>
The recording is original and license-free: nothing in it is sampled."""
import sys, numpy as np, soundfile as sf
SR, BPM = 48000, 110
B = 60 / BPM
rng = np.random.default_rng(7)
N = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def hz(n, octave): return 440 * 2 ** ((N[n] - 9 + 12 * (octave - 4)) / 12)

# melody in (note, octave, beats); each bar is 4 beats; bar 0 is a one-bar intro
M = []
def bar(*ev): M.extend(ev)
rest = lambda b: ("R", 0, b)
bar(rest(2), ("G", 5, 1), ("E", 5, 1))                       # intro pickup
for _ in range(2): bar(("E", 5, 1), ("E", 5, 1), ("E", 5, 2))  # jingle bells (x2)
bar(("E", 5, 1), ("G", 5, 1), ("C", 5, 1.5), ("D", 5, .5)); bar(("E", 5, 4))
bar(("F", 5, 1), ("F", 5, 1), ("F", 5, 1.5), ("F", 5, .5)); bar(("F", 5, 1), ("E", 5, 1), ("E", 5, 1), ("E", 5, .5), ("E", 5, .5))
bar(("E", 5, 1), ("D", 5, 1), ("D", 5, 1), ("E", 5, 1)); bar(("D", 5, 2), ("G", 5, 2))
bar(("E", 5, 1), ("G", 5, 1), ("C", 5, 1.5), ("D", 5, .5)); bar(("C", 5, 3), rest(1))
CH = [("C", 3), ("C", 3), ("C", 3), ("C", 3), ("C", 3), ("F", 3), ("F", 3), ("G", 3), ("G", 3), ("C", 3), ("C", 3), ("C", 3), ("C", 3)]
total_beats = sum(e[2] for e in M)
T = total_beats * B
n = int(T * SR) + SR * 2
L = np.zeros(n); R = np.zeros(n)
def put(buf, sig, t0, pan=0.0):
    i = int(t0 * SR); sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig
def bell(f, dur):
    t = np.arange(int(SR * dur)) / SR
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for m, a, d in ((1, 1, 2.6), (2.0, .45, 4), (2.76, .3, 5.5), (5.4, .12, 9), (8.9, .05, 14)))
    s *= np.minimum(1, t / .004)
    return s * .22
def pad(f, dur):
    t = np.arange(int(SR * dur)) / SR
    s = sum(np.sin(2 * np.pi * f * m * t + p) / m for m, p in ((1, 0), (2, .3), (3, .9)))
    s += .6 * np.sin(2 * np.pi * f * 1.003 * t)
    env = np.minimum(1, t / .6) * np.minimum(1, (dur - t) / .8)
    return s * env * .05
def bass(f, dur):
    t = np.arange(int(SR * dur)) / SR
    s = (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 3.2) * np.minimum(1, t / .01)
    return s * .17
def shake(dur=.09, g=.05):
    x = rng.standard_normal(int(SR * dur)); x = np.diff(x, prepend=0); x = np.diff(x, prepend=0)  # bright, high-passed noise
    t = np.arange(len(x)) / SR
    return x * np.exp(-t * 45) * np.minimum(1, t / .003) * g

# melody
t = 0.0
for nt, o, b in M:
    if nt != "R":
        s = bell(hz(nt, o), min(b * B + 1.2, 3.0))
        put(L, s * 1.0, t); put(R, s * .85, t + .004)
        put(L, s * .35, t + .26); put(R, s * .35, t + .27)   # soft echo
    t += b * B
# chords: pad per bar, bass on beats 1 and 3
chords = {"C": (0, 4, 7), "F": (5, 9, 12), "G": (7, 11, 14)}
for i, (root, o) in enumerate(CH):
    t0 = i * 4 * B
    if t0 >= T: break
    base = hz(root, 3)
    for st in chords[root]:
        f = base * 2 ** ((st) / 12) * 2
        s = pad(f, 4 * B + .4)
        put(L, s, t0, 0); put(R, s, t0)
    for beat in (0, 2):
        f = base if i >= 1 else base
        put(L, bass(f * 2, 1.2 * B), t0 + beat * B); put(R, bass(f * 2, 1.2 * B), t0 + beat * B)
# sleigh bells: eighth notes with accents on the beat, panned a little
for k in range(int(T / (B / 2))):
    tt = k * B / 2
    if tt < B * 2 or tt > T - 4 * B: continue
    g = 1.0 if k % 2 == 0 else .55
    s = shake(g=.05 * g)
    put(L, s * (1.1 if k % 4 in (0, 1) else .8), tt); put(R, s * (.8 if k % 4 in (0, 1) else 1.1), tt)
# gentle fade in/out
fin = np.minimum(1, np.arange(n) / (SR * .05))
fout = np.minimum(1, np.maximum(0, (n - np.arange(n)) / (SR * 1.5)))
out = np.stack([L * fin * fout, R * fin * fout], 1)
# phone-speaker friendly: roll off below 120 Hz (simple one-pole high-pass) and normalise peak to -3 dBFS
a = np.exp(-2 * np.pi * 120 / SR)
for c in range(2):
    y = np.zeros(n); x = out[:, c]; px = py = 0.0
    for i in range(n):
        py = a * (py + x[i] - px); px = x[i]; y[i] = py
    out[:, c] = y
out *= 10 ** (-3 / 20) / np.max(np.abs(out))
sf.write(sys.argv[1], out.astype(np.float32), SR, subtype="PCM_16")
print("seconds", n / SR)
