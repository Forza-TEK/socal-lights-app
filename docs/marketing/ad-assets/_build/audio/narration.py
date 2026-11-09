"""Renders the narration lines for the ad videos with the Kokoro voice af_heart (the same voice as the tutorial videos).
Usage: python3 narration.py <kokoro-folder> <outDir>
Writes <outDir>/<id>-<n>.wav (one file per sentence) and <outDir>/lines.json (text and length of each)."""
import sys, json, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

LINES = {
    "a08": ["Looking for holiday lights tonight?", "Tap Find my location,", "and see what is lighting up near you.", "Free, on SoCal Lights dot app."],
    "a08r": ["Looking for holiday lights tonight?", "Tap Find my location,", "and see what is lighting up near you.", "Tap a place to see the details.", "Free, on SoCal Lights dot app."],
    "a09": ["Plan your whole night.", "Tap the heart on the places you love,", "then tap Route these.", "SoCal Lights dot app, free for families."],
    "a09r": ["Plan your whole night.", "Tap the heart on the places you love,", "then tap Route these.", "Your stops open in the maps app you choose.", "SoCal Lights dot app, free for families."],
    "a06": ["Is your home all lit up?", "Put it on the map in a few minutes.", "And there it is, on the map.", "Free, on SoCal Lights dot app."],
    "a06r": ["Is your home all lit up?", "Put it on the map in a few minutes.", "Add a name, a few words, and a street.", "And there it is, on the map.", "Free, on SoCal Lights dot app."],
    "a07": ["One tap, one route.", "Route these opens your stops in the maps app you choose.", "SoCal Lights dot app."],
    "a07r": ["One tap, one route.", "Route these opens your stops in the maps app you choose.", "Pick your stops, and go.", "SoCal Lights dot app."],
}
folder, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
k = Kokoro(folder + "/kokoro-v1.0.onnx", folder + "/voices-v1.0.bin")
meta = {}
for vid, lines in LINES.items():
    meta[vid] = []
    for i, t in enumerate(lines):
        s, sr = k.create(t, voice="af_heart", speed=0.88, lang="en-us")
        s = np.asarray(s, dtype=np.float32)
        sf.write(f"{out}/{vid}-{i}.wav", s, sr, subtype="PCM_16")
        meta[vid].append({"text": t, "sec": len(s) / sr, "sr": sr})
json.dump(meta, open(out + "/lines.json", "w"), indent=1)
print(json.dumps({k2: [round(x["sec"], 2) for x in v] for k2, v in meta.items()}))
