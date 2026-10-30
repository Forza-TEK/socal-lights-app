#!/usr/bin/env python3
"""Photo pass: give events that have no photo one from their own source page.

Usage: python3 scripts/photo_pass.py --out migrations/NNNN_event_photos.sql [--rehost 150] [--max-events-per-page 3]

For every live event without an image whose page is tied to at most N events (so a roundup page never puts one photo on
many events) it tries the page's og:image, then the best photo in the page content. A photo under 1.5 MB is hotlinked;
a good larger one (at least 800 px wide, under 15 MB) is resized to 1280 px JPEG and saved in public/img/events/ (up to
--rehost files). The script identifies itself honestly (SoCalLightsBot) and never retries a page that refuses it:
pages that block it are left for a manual photo. Writes UPDATE statements; run `npm run validate`. Needs Pillow.
"""
import argparse, collections, io, json, os, re, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

UA = "Mozilla/5.0 (compatible; SoCalLightsBot/1.0; +https://socallights.app)"
BAD = re.compile(r"logo|icon|favicon|sprite|avatar|blank|spacer|banner|header|footer|button|badge|social|facebook|twitter|instagram|youtube|appstore|playstore|map|qr|sponsor|loading|pixel|\.svg|\.gif|1x1|arrow|menu|search|share|gravatar|ticket|admit", re.I)

def get(u, n=20_000_000):
    return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=20).read(n)

def candidates(url):
    h = get(url, 700_000).decode("utf8", "ignore")
    out = []
    for pat in (r'<meta[^>]+(?:property|name)=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)', r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']og:image', r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)'):
        m = re.search(pat, h)
        if m: out.append(m.group(1))
    for m in re.finditer(r"<img[^>]+>", h):
        s = re.search(r'(?:data-src|data-lazy-src|src)=["\']([^"\']+)', m.group(0))
        if s: out.append(s.group(1))
    seen, res = set(), []
    for c in out:
        c = urllib.parse.urljoin(url, c.replace("&amp;", "&"))
        c = re.sub(r"-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))", r"\1", c)
        if c in seen or "--" in c or BAD.search(urllib.parse.unquote(c.rsplit("/", 1)[-1])): continue
        if not re.search(r"\.(jpe?g|png|webp)|format=|/image", c, re.I): continue
        seen.add(c); res.append(c)
    return res[:9]

def best(url):
    pick = None
    for c in candidates(url):
        try:
            b = get(c); im = Image.open(io.BytesIO(b)); w, h = im.size
        except Exception: continue
        if len(b) < 20000 or w < 480 or h < 260 or not (0.8 <= w / h <= 2.8): continue
        big = len(b) > 1_500_000
        if big and (w < 800 or len(b) > 15_000_000): continue
        score = w * h
        if pick is None or (not big, score) > (not pick[2], pick[1]): pick = (c, score, big, b)
    return pick

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True); ap.add_argument("--rehost", type=int, default=150)
    ap.add_argument("--max-events-per-page", type=int, default=3); ap.add_argument("--api", default="https://socallights.app/api/events")
    a = ap.parse_args()
    ev = json.load(urllib.request.urlopen(urllib.request.Request(a.api, headers={"User-Agent": UA})))
    by = collections.defaultdict(list)
    for e in ev:
        if not e.get("img") and (e.get("u") or "").startswith("http"): by[e["u"].split("#")[0]].append(e["id"])
    urls = [u for u, ids in by.items() if len(ids) <= a.max_events_per_page]
    print(len(urls), "pages to try")
    def go(u):
        try: return u, best(u)
        except Exception: return u, None
    with ThreadPoolExecutor(10) as ex: res = list(ex.map(go, urls))
    cnt = collections.Counter(p[0] for _, p in res if p)
    q = lambda s: "'" + s.replace("'", "''") + "'"
    lines = ["-- Event photos (scripts/photo_pass.py): page's own photo, hotlinked if under 1.5 MB else resized copy in public/img/events/"]
    hot = reh = 0
    for u, p in res:
        if not p or cnt[p[0]] > 1: continue
        for i in by[u]:
            if p[2]:
                if reh >= a.rehost: continue
                rel = f"img/events/{i}.jpg"; os.makedirs("public/img/events", exist_ok=True)
                im = Image.open(io.BytesIO(p[3])).convert("RGB"); im.thumbnail((1280, 1280)); im.save("public/" + rel, "JPEG", quality=80, optimize=True)
                src = "/" + rel; reh += 1
            else: src = p[0]; hot += 1
            lines.append(f"UPDATE events SET image={q(src)}, updated_at=datetime('now') WHERE id={q(i)} AND (image IS NULL OR image='');")
    open(a.out, "w").write("\n".join(lines) + "\n")
    print(hot, "hotlinked,", reh, "re-hosted ->", a.out)

if __name__ == "__main__": main()
