import sys, json, os, subprocess, wave
import numpy as np
from faster_whisper import WhisperModel
S=os.environ.get("ASR_DIR","/tmp/asr")
files=sys.argv[1:]
m=WhisperModel('small.en',device='cpu',compute_type='int8',cpu_threads=2)
for f in files:
    name=os.path.basename(f)[:-4]
    out=f"{S}/{name}.json"
    if os.path.exists(out): continue
    wav=f"{S}/{name}.wav"
    subprocess.run(["ffmpeg","-v","error","-y","-i",f,"-vn","-ac","1","-ar","16000",wav],check=True)
    with wave.open(wav) as wf: audio=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
    segs,info=m.transcribe(audio,word_timestamps=True,language="en",vad_filter=False,beam_size=5,condition_on_previous_text=False)
    words=[]
    for sg in segs:
        for w in sg.words: words.append([w.word.strip(),round(w.start,2),round(w.end,2),round(w.probability,2)])
    json.dump({"file":f,"duration":info.duration,"words":words},open(out,"w"))
    os.remove(wav)
    print("done",name,len(words),flush=True)
