# Usage: python3 tts.py <voice.onnx | kokoro-folder> <texts.json> <outDir>   texts.json = ["sentence", ...]; writes 0.wav, 1.wav, ...
# TTS_ENGINE=kokoro  -> the Kokoro voice (more natural, warmer; model files in the folder given as the first argument)
#                       KOKORO_VOICE (default af_heart), KOKORO_SPEED (default 1.0)
# otherwise          -> the hfc_female Piper voice, slowed by LENGTH_SCALE (the first set of videos)
import sys, json, wave, os
texts = json.load(open(sys.argv[2])); out = sys.argv[3]
if os.environ.get("TTS_ENGINE") == "kokoro":
    import numpy as np, soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(sys.argv[1] + "/kokoro-v1.0.onnx", sys.argv[1] + "/voices-v1.0.bin")
    voice, speed = os.environ.get("KOKORO_VOICE", "af_heart"), float(os.environ.get("KOKORO_SPEED", "1.0"))
    import re
    # Approved voice rules (owner, 2026-11): the brand is said with the stress on SO ("SO-cal Lights dot app"), and there is a very slight pause (a comma) after the word "free" when it ends a phrase, e.g. "Free, on SoCal Lights dot app".
    # Done on the phonemes, so every other word is spoken exactly as before.
    def fix(ph): return re.sub(r"sˌoʊ ?kˈæl", "sˈoʊkæl", ph)
    for i, t in enumerate(texts):
        if not t: continue
        t = re.sub(r"\b([Ff]ree)\b(?=\s+(?:on|at|for|in)\b)", r"\1,", t)  # slight pause after "free" before "on SoCal Lights", "for families", ...
        s, sr = k.create(fix(k.tokenizer.phonemize(t, "en-us")), voice=voice, speed=speed, lang="en-us", is_phonemes=True)
        sf.write(f"{out}/{i}.wav", np.asarray(s), sr, subtype="PCM_16")
else:
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(sys.argv[1])
    cfg = SynthesisConfig(length_scale=float(os.environ.get('LENGTH_SCALE','1.0')), noise_scale=0.5, noise_w_scale=0.6)
    for i, t in enumerate(texts):
        if not t: continue
        with wave.open(f"{out}/{i}.wav", "wb") as w: voice.synthesize_wav(t, w, syn_config=cfg)
