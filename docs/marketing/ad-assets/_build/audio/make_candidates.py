"""Three original festive music candidates for the ads, synthesised with numpy only (no samples, no third-party recording).
Melodies are public-domain carols (Jingle Bells 1857, Deck the Halls, We Wish You a Merry Christmas); the arrangements and the recordings are ours.
Usage: python3 make_candidates.py <outDir>      -> A-bright-bells-pop.wav, B-swing-along.wav, C-cozy-sparkle.wav (then loudness-normalised and encoded by ffmpeg, see README)."""
import sys, numpy as np, soundfile as sf
SR = 48000
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11, "F#": 6, "Bb": 10}
def hz(n, o): return 440 * 2 ** ((NOTE[n] - 9 + 12 * (o - 4)) / 12)
rng = np.random.default_rng(11)

class Mix:
    def __init__(self, secs): self.n = int(secs * SR); self.L = np.zeros(self.n); self.R = np.zeros(self.n)
    def add(self, s, t, gl=1.0, gr=1.0):
        i = int(t * SR)
        if i < 0 or i >= self.n: return
        s = s[: self.n - i]; self.L[i:i + len(s)] += s * gl; self.R[i:i + len(s)] += s * gr
def tt(d): return np.arange(int(SR * d)) / SR
def bell(f, d=2.5, g=.2):
    t = tt(d); s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in ((1, 1, 2.4), (2, .42, 4), (2.76, .3, 5.5), (5.4, .12, 9)))
    return s * np.minimum(1, t / .003) * g
def celesta(f, d=1.6, g=.16):
    t = tt(d); s = (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 8)) * np.exp(-t * 3.4)
    return s * np.minimum(1, t / .002) * g
def vibes(f, d=1.8, g=.2):
    t = tt(d); s = (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 6)) * np.exp(-t * 1.6) * (1 + .25 * np.sin(2 * np.pi * 5.2 * t))
    return s * np.minimum(1, t / .004) * g
def pluck(f, d=1.2, g=.2):  # Karplus-Strong
    n = int(SR * d); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * .996
    return out * np.minimum(1, tt(d) / .002) * g
def pad(f, d, g=.045):
    t = tt(d); s = sum(np.sin(2 * np.pi * f * m * t + p) / m for m, p in ((1, 0), (2, .3), (3, .9))) + .6 * np.sin(2 * np.pi * f * 1.004 * t)
    return s * np.minimum(1, t / .5) * np.minimum(1, (d - t) / .7) * g
def bass(f, d=.5, g=.2, decay=3.0):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * decay) * np.minimum(1, t / .008) * g
def kick(g=.5):
    t = tt(.22); f = 50 + 110 * np.exp(-t * 35); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 17) * g
def noise(d, hp=2):
    x = rng.standard_normal(int(SR * d))
    for _ in range(hp): x = np.diff(x, prepend=0)
    return x
def shaker(g=.05, d=.08): t = tt(d); return noise(d, 2) * np.exp(-t * 45) * np.minimum(1, t / .003) * g
def clap(g=.12):
    out = np.zeros(int(SR * .2))
    for k, o in enumerate((0, .012, .024)):
        x = noise(.12, 1) * np.exp(-tt(.12) * (60 if k < 2 else 28)); i = int(o * SR); out[i:i + len(x)] += x
    return out * g
def snare(g=.1):
    t = tt(.16); return (noise(.16, 1) * .8 + np.sin(2 * np.pi * 190 * t) * .5) * np.exp(-t * 22) * g
def brush(g=.05, d=.22):
    t = tt(d); return noise(d, 0) * np.exp(-t * 11) * np.minimum(1, t / .03) * g
def ride(g=.05):
    t = tt(.5); return noise(.5, 2) * np.exp(-t * 9) * g

def finish(m, path):
    n = m.n; fin = np.minimum(1, np.arange(n) / (SR * .04)); fout = np.clip((n - np.arange(n)) / (SR * 1.6), 0, 1)
    out = np.stack([m.L * fin * fout, m.R * fin * fout], 1)
    a = np.exp(-2 * np.pi * 110 / SR)
    for c in range(2):  # one-pole high-pass at 110 Hz: nothing a phone speaker cannot play
        x = out[:, c]; y = np.zeros(n); px = py = 0.0
        for i in range(n): py = a * (py + x[i] - px); px = x[i]; y[i] = py
        out[:, c] = y
    out *= 10 ** (-3 / 20) / np.max(np.abs(out)); sf.write(path, out.astype(np.float32), SR, subtype="PCM_16")

def melody(m, notes, B, t0=0.0, swing=0.0, osc=bell, echo=True, gain=1.0):
    t = t0
    for nt, o, b in notes:
        if nt != "R":
            tn = t + (swing * B if abs((t - t0) / B % 1 - .5) < 1e-6 else 0)
            s = osc(hz(nt, o)) * gain; m.add(s, tn, 1.0, .85)
            if echo: m.add(s * .3, tn + .25, .3, .35)
        t += b * B
    return t

# ---------------------------------------------------------------------------------------------------------------- A: Bright bells pop
def track_A(path):
    BPM = 112; B = 60 / BPM; secs = 24
    m = Mix(secs + 1.5)
    mel = [("R", 0, 2), ("G", 5, 1), ("E", 5, 1)] + [("E", 5, 1), ("E", 5, 1), ("E", 5, 2)] * 2 + [("E", 5, 1), ("G", 5, 1), ("C", 5, 1.5), ("D", 5, .5), ("E", 5, 4)] \
        + [("F", 5, 1), ("F", 5, 1), ("F", 5, 1.5), ("F", 5, .5), ("F", 5, 1), ("E", 5, 1), ("E", 5, 1), ("E", 5, .5), ("E", 5, .5)] \
        + [("E", 5, 1), ("D", 5, 1), ("D", 5, 1), ("E", 5, 1), ("D", 5, 2), ("G", 5, 2)] + [("E", 5, 1), ("G", 5, 1), ("C", 5, 1.5), ("D", 5, .5), ("C", 5, 3), ("R", 0, 1)]
    melody(m, mel, B)
    prog = ["C", "C", "C", "C", "C", "F", "F", "G", "G", "C", "C", "C"]; tri = {"C": (0, 4, 7), "F": (5, 9, 12), "G": (7, 11, 14)}
    for i, ch in enumerate(prog):
        t0 = i * 4 * B
        if t0 >= secs: break
        base = hz(ch, 3)
        for st in tri[ch]: m.add(pad(base * 2 ** (st / 12) * 2, 4 * B + .3), t0, .8, .8)
        for k in range(8):  # bouncy bass: root, octave, root, fifth on the eighths
            if i == 0 and k < 2 * 2: continue
            f = base * (2 if k % 4 in (0, 2) else (3 if k % 4 == 3 else 2))
            if k % 2 == 0: m.add(bass(f, .45, .2), t0 + k * B / 2, 1, 1)
        for beat in range(4):
            if i >= 1: m.add(kick(.55 if beat % 2 == 0 else .35), t0 + beat * B, 1, 1)
            if beat in (1, 3) and i >= 1: m.add(clap(.1), t0 + beat * B, 1, 1)
        for k in range(16):
            if i >= 1: m.add(shaker(.03 if k % 2 else .05), t0 + k * B / 4, 1.1 if k % 2 else .8, .8 if k % 2 else 1.1)
    finish(m, path)

# ---------------------------------------------------------------------------------------------------------------- B: Swing-along
def track_B(path):
    BPM = 120; B = 60 / BPM; secs = 24
    m = Mix(secs + 1.5); S = .17  # swing: second eighth late by 0.17 beat
    # Deck the Halls (public domain), C major
    mel = [("R", 0, 1), ("G", 5, 1.5), ("F", 5, .5), ("E", 5, 1), ("D", 5, 1), ("C", 5, 1), ("D", 5, 1), ("E", 5, 1), ("C", 5, 1), ("D", 5, 1), ("E", 5, 1), ("F", 5, 1), ("D", 5, 1), ("E", 5, 1.5), ("F", 5, .5), ("G", 5, 1), ("E", 5, 1)] \
        + [("G", 5, 1.5), ("F", 5, .5), ("E", 5, 1), ("D", 5, 1), ("C", 5, 1), ("D", 5, 1), ("E", 5, 1), ("C", 5, 1), ("D", 5, 1.5), ("E", 5, .5), ("D", 5, 1), ("B", 4, 1), ("C", 5, 4)] \
        + [("G", 5, 1.5), ("F", 5, .5), ("E", 5, 1), ("D", 5, 1), ("C", 5, 1), ("D", 5, 1), ("E", 5, 1), ("C", 5, 1), ("D", 5, 2), ("G", 4, 2), ("C", 5, 4)]
    t = 0.0
    for nt, o, b in mel:
        if nt != "R":
            late = S * B if abs((t / B) % 1 - .5) < 1e-6 else 0
            f = hz(nt, o); m.add(vibes(f, 1.8, .24), t + late, 1.0, .8); m.add(bell(f * 2, 1.6, .06), t + late, .6, .9)
        t += b * B
    prog = [("C", 3, (0, 4, 7, 9)), ("A7", 2, (0, 4, 7, 10)), ("D", 3, (0, 3, 7, 10)), ("G7", 2, (0, 4, 7, 10))]
    roots = {"C": "C", "A7": "A", "D": "D", "G7": "G"}
    for i in range(12):
        t0 = i * 4 * B
        if t0 >= secs: break
        name, o, ch = prog[i % 4]; r = hz(roots[name], 2)
        for k, st in enumerate((0, 4, 7, 4)):  # walking bass, quarter notes
            m.add(bass(r * 2 ** (st / 12), B * .9, .28, 2.2), t0 + k * B, 1, 1)
        for st in (4, 7, 10 if "7" in name else 12): m.add(pad(hz(roots[name], 3) * 2 ** (st / 12), 4 * B + .2, .03), t0, .8, .8)
        for k in range(4):  # ride: ching ching-a-ching, brushes on 2 and 4
            m.add(ride(.04), t0 + k * B, 1.1, .8)
            if k % 2 == 1:
                m.add(ride(.03), t0 + k * B + (2 / 3) * B * .5 + S * B * 0, .8, 1.1)
                m.add(brush(.06), t0 + k * B, .9, 1)
        m.add(brush(.03, .5), t0, .8, .8)
    finish(m, path)

# ---------------------------------------------------------------------------------------------------------------- C: Cozy sparkle
def track_C(path):
    BPM = 100; B = 60 / BPM; secs = 24
    m = Mix(secs + 1.5)
    # We Wish You a Merry Christmas (public domain), G major, 3/4
    p = [("D", 4, 1)]
    bars = [[("G", 4, 1), ("G", 4, .5), ("A", 4, .5), ("G", 4, .5), ("F#", 4, .5)], [("E", 4, 1), ("E", 4, 1), ("E", 4, 1)], [("A", 4, 1), ("A", 4, .5), ("B", 4, .5), ("A", 4, .5), ("G", 4, .5)], [("F#", 4, 1), ("D", 4, 1), ("D", 4, 1)],
            [("B", 4, 1), ("B", 4, .5), ("C", 5, .5), ("B", 4, .5), ("A", 4, .5)], [("G", 4, 1), ("E", 4, 1), ("D", 4, .5), ("D", 4, .5)], [("E", 4, 1), ("A", 4, 1), ("F#", 4, 1)], [("G", 4, 3)]]
    mel = p + [x for b in bars for x in b] + [x for b in bars[:4] for x in b] + [("G", 4, 3)]
    t = 0.0
    for nt, o, b in [("R", 0, 2)] + mel:
        if nt != "R":
            f = hz(nt, o); m.add(pluck(f, 1.1, .22), t, 1.0, .85); m.add(celesta(f * 2, 1.4, .09), t, .6, .9)
        t += b * B
    chords = [("G", (0, 4, 7)), ("G", (0, 4, 7)), ("C", (0, 4, 7)), ("D", (0, 4, 7)), ("G", (0, 4, 7)), ("C", (0, 4, 7)), ("D", (0, 4, 7)), ("G", (0, 4, 7))]
    for i in range(int(secs / (3 * B)) + 1):
        t0 = i * 3 * B + 2 * B
        if t0 >= secs: break
        r, ch = chords[i % 8]
        for st in ch: m.add(pad(hz(r, 3) * 2 ** (st / 12), 3 * B + .3, .05), t0, .8, .8)
        m.add(bass(hz(r, 2), B * 1.2, .22, 2.4), t0, 1, 1)
        for k, st in enumerate((12, 16, 19, 24, 19, 16)):  # twinkling celesta arpeggio, eighths
            m.add(celesta(hz(r, 4) * 2 ** (st / 12) / 2, 1.0, .1), t0 + k * B / 2, .9 if k % 2 else .6, .6 if k % 2 else .9)
        m.add(clap(.07), t0 + B, 1, 1); m.add(clap(.07), t0 + 2 * B, 1, 1)  # gentle hand-claps on 2 and 3
        m.add(shaker(.03), t0, 1, 1)
    finish(m, path)

if __name__ == "__main__":
    out = sys.argv[1]
    track_A(out + "/A-bright-bells-pop.wav"); print("A")
    track_B(out + "/B-swing-along.wav"); print("B")
    track_C(out + "/C-cozy-sparkle.wav"); print("C")
