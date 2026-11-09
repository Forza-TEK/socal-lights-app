import sys, json, re, os, difflib, glob, statistics
P=os.environ.get("VTT_DIR","public/tutorials")
S=os.environ.get("ASR_DIR","/tmp/asr")
def norm(w):
    w=w.lower().replace("’","'")
    return re.sub(r"[^a-z0-9']","",w)
def ts(t):
    h,m,s=t.split(":"); return int(h)*3600+int(m)*60+float(s)
def cues(vtt):
    out=[];lines=open(vtt).read().split("\n");i=0
    while i<len(lines):
        if "-->" in lines[i]:
            a,b=lines[i].split("-->");txt=[];i+=1
            while i<len(lines) and lines[i].strip(): txt.append(lines[i]);i+=1
            out.append((ts(a.strip()),ts(b.strip())," ".join(txt)))
        i+=1
    return out
ALT={"socal":["so","cal"],"dot":["."],}
def run(name):
    j=json.load(open(f"{S}/{name}.json")); cs=cues(f"{P}/{name}.vtt")
    hw=[(norm(w[0]),w[1],w[2]) for w in j["words"] if norm(w[0])]
    sw=[];ci=[]
    for k,(a,b,t) in enumerate(cs):
        for w in t.split():
            n=norm(w)
            if n: sw.append(n);ci.append(k)
    sm=difflib.SequenceMatcher(None,[w[0] for w in hw],sw,autojunk=False)
    match=[None]*len(sw)
    for a,b,n in sm.get_matching_blocks():
        for d in range(n): match[b+d]=a+d
    hit=sum(1 for m in match if m is not None)
    # per cue
    per=[]
    for k,(a,b,t) in enumerate(cs):
        idx=[x for x in range(len(sw)) if ci[x]==k]
        if not idx: continue
        mm=[match[x] for x in idx if match[x] is not None]
        rate=len(mm)/len(idx)
        off=(hw[mm[0]][1]-a) if mm else None
        per.append((k,a,t,rate,off))
    offs=[p[4] for p in per if p[4] is not None and p[3]>=0.6]
    bad=[p for p in per if p[3]<0.75]
    late=[p for p in per if p[4] is not None and p[3]>=0.6 and abs(p[4])>0.6]
    # words in script not heard, words heard that are extra
    missed=[sw[x] for x in range(len(sw)) if match[x] is None]
    wer=1-hit/max(1,len(sw))
    first_voice=hw[0][1] if hw else None
    return dict(name=name,wer=wer,cues=len(per),bad=bad,late=late,med=statistics.median(offs) if offs else None,first=first_voice,first_cue=cs[0][0] if cs else None,dur=j["duration"],missed=missed)
if __name__=="__main__":
    names=sys.argv[1:] or sorted(os.path.basename(f)[:-5] for f in glob.glob(f"{S}/*.json"))
    for n in names:
        r=run(n)
        print(f"{n:34s} unmatched {r['wer']*100:4.1f}%  cues {r['cues']:3d}  lowmatch {len(r['bad']):2d}  off>0.6s {len(r['late']):2d}  median off {r['med'] if r['med'] is None else round(r['med'],2)}  first voice {r['first']} vs cue {r['first_cue']}")
