# Usage: python3 tts.py <voice.onnx> <texts.json> <outDir>   texts.json = ["sentence", ...]; writes 0.wav, 1.wav, ... (the hfc_female Piper voice, slowed to about 85 percent)
import sys, json, wave, os
from piper import PiperVoice, SynthesisConfig
voice = PiperVoice.load(sys.argv[1]); texts = json.load(open(sys.argv[2])); out = sys.argv[3]
cfg = SynthesisConfig(length_scale=float(os.environ.get('LENGTH_SCALE','1.0')), noise_scale=0.5, noise_w_scale=0.6)
for i, t in enumerate(texts):
    if not t: continue
    with wave.open(f"{out}/{i}.wav", "wb") as w: voice.synthesize_wav(t, w, syn_config=cfg)
