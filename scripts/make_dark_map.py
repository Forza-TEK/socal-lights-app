#!/usr/bin/env python3
"""Dark colorful map style for the night theme. Run from the repo root: python3 scripts/make_dark_map.py"""
import json,re,colorsys,sys
def parse(c):
    c=c.strip().lower()
    m=re.fullmatch(r"#([0-9a-f]{3,8})",c)
    if m:
        h=m.group(1)
        if len(h)in(3,4): h="".join(x*2 for x in h)
        r,g,b=int(h[0:2],16),int(h[2:4],16),int(h[4:6],16);a=int(h[6:8],16)/255 if len(h)==8 else 1
        return r/255,g/255,b/255,a
    m=re.fullmatch(r"rgba?\(([^)]*)\)",c)
    if m:
        p=[x.strip() for x in m.group(1).split(",")]
        def v(x): return float(x[:-1])/100 if x.endswith("%") else float(x)/255
        return v(p[0]),v(p[1]),v(p[2]),float(p[3]) if len(p)>3 else 1
    m=re.fullmatch(r"hsla?\(([^)]*)\)",c)
    if m:
        p=[x.strip() for x in m.group(1).split(",")]
        h=float(p[0].replace("deg",""))/360;s=float(p[1].rstrip("%"))/100;l=float(p[2].rstrip("%"))/100
        r,g,b=colorsys.hls_to_rgb(h%1,l,s);return r,g,b,float(p[3]) if len(p)>3 else 1
    return None
def fmt(r,g,b,a):
    return f"rgba({round(r*255)},{round(g*255)},{round(b*255)},{round(a,3)})" if a<1 else "#%02x%02x%02x"%(round(r*255),round(g*255),round(b*255))
DIM=0.60  # night map = the day map with every color multiplied by this (same hues, just dimmed)
def tx(c,kind):
    p=parse(c)
    if not p: return c
    r,g,b,a=p
    return fmt(r*DIM,g*DIM,b*DIM,a)
def walk(v,kind):
    if isinstance(v,str): return tx(v,kind)
    if isinstance(v,list): return [walk(x,kind) if not (isinstance(x,str) and not parse(x)) else x for x in v]
    return v
KIND={"background-color":"fill","fill-color":"fill","fill-extrusion-color":"fill","line-color":"line","fill-outline-color":"line","text-color":"text","text-halo-color":"halo","icon-halo-color":"halo","icon-color":"icon","circle-color":"icon","circle-stroke-color":"icon"}
def darkify(style):
    for L in style["layers"]:
        pt=L.get("paint",{})
        for k in list(pt):
            if k in KIND: pt[k]=walk(pt[k],KIND[k])
    style["name"]="SoCal dark liberty"
    return style
if __name__=="__main__":
    # Regenerates public/map-dark.json: OpenFreeMap's colorful "liberty" style, darkened (every color of the day map multiplied by 0.6: same hues, just dimmed)
    import urllib.request
    req=urllib.request.Request("https://tiles.openfreemap.org/styles/liberty",headers={"User-Agent":"SoCalLights-style-build/1.0 (info@socallights.app)"})
    d=darkify(json.load(urllib.request.urlopen(req)))
    json.dump(d,open("public/map-dark.json","w"),separators=(",",":"));print("wrote public/map-dark.json",len(d["layers"]),"layers")
