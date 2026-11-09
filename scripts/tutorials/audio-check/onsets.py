import subprocess,re,glob,os,sys
sys.path.insert(0,"/tmp/asr")
import analyze
P=os.environ.get("VTT_DIR","public/tutorials")
bad_total=0
for mp4 in sorted(glob.glob(P+"/*.mp4")):
    n=os.path.basename(mp4)[:-4]
    if n.startswith("_") or not os.path.exists(f"{P}/{n}.vtt"): continue
    out=subprocess.run(["ffmpeg","-hide_banner","-i",mp4,"-vn","-af","silencedetect=noise=-38dB:d=0.3","-f","null","-"],capture_output=True,text=True).stderr
    on=[float(x) for x in re.findall(r"silence_end: ([\d.]+)",out)]
    cs=analyze.cues(f"{P}/{n}.vtt"); miss=[];offs=[]
    for k,c in enumerate(cs):
        gap=c[0]-(cs[k-1][1] if k else 0)
        if k==0 or gap<0.45: continue
        near=min(on,key=lambda t:abs(t-c[0])) if on else None
        if near is None: continue
        offs.append(near-c[0])
        if abs(near-c[0])>0.3: miss.append((round(c[0],1),round(near-c[0],2)))
    bad_total+=len(miss)
    print(f"{n:30s} clip starts {len(offs):3d}  >0.3s off: {len(miss):2d} {miss[:4]}")
print("total off",bad_total)
