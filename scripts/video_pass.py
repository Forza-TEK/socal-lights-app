#!/usr/bin/env python3
"""Finds the video an event's own page embeds (a YouTube or Vimeo player) and writes guarded UPDATE statements for migrations/.
  python3 scripts/video_pass.py --out /tmp/videos.sql [--limit 300]
Rules (docs/sweep-methods.md 5.2): only an embedded player on the event's OWN page (an <iframe> of youtube/youtube-nocookie/vimeo), the page may belong to at most 3 events,
the honest bot name, no retry under another identity; a page that answers 401/403/429 or a challenge is skipped and listed (never bypassed). Stored in the clean watch form (public/video.js).
Only fills events that have no video yet: AND (video IS NULL OR video='')."""
import argparse, collections, json, re, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = "SoCalLightsBot/1.0 (+https://socallights.app)"
YT = re.compile(r"^[A-Za-z0-9_-]{11}$")

def clean(u):
    """Same rules as public/video.js parseVideo: returns the clean watch address or None."""
    try: p = urllib.parse.urlparse(u.strip())
    except Exception: return None
    if p.scheme not in ("http", "https"): return None
    h = re.sub(r"^(www|m)\.", "", (p.hostname or "").lower()); parts = [x for x in p.path.split("/") if x]; q = urllib.parse.parse_qs(p.query)
    if h == "youtu.be": vid = parts[0] if parts else ""
    elif h in ("youtube.com", "youtube-nocookie.com"): vid = (q.get("v", [""])[0] if parts[:1] == ["watch"] else (parts[1] if len(parts) > 1 and parts[0] in ("embed", "shorts", "live", "v") else ""))
    else: vid = ""
    if vid and YT.match(vid): return f"https://www.youtube.com/watch?v={vid}"
    if h in ("vimeo.com", "player.vimeo.com"):
        v = (parts[1] if h == "player.vimeo.com" and len(parts) > 1 and parts[0] == "video" else next((x for x in parts if re.fullmatch(r"\d{5,12}", x)), "")) if h != "player.vimeo.com" or parts[:1] == ["video"] else ""
        if re.fullmatch(r"\d{5,12}", v or ""): return f"https://vimeo.com/{v}"
    return None

def embedded(url):
    html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20).read(900_000).decode("utf8", "ignore")
    for m in re.finditer(r"<iframe[^>]+(?:data-src|data-lazy-src|src)=[\"']([^\"']+)", html, re.I):
        w = clean(urllib.parse.urljoin(url, m.group(1).replace("&amp;", "&")))
        if w: return w
    return None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True); ap.add_argument("--limit", type=int, default=400)
    ap.add_argument("--api", default="https://socallights.app/api/events?full=1"); a = ap.parse_args()
    ev = json.load(urllib.request.urlopen(urllib.request.Request(a.api, headers={"User-Agent": UA})))
    by = collections.defaultdict(list)
    for e in ev:
        if not e.get("vid") and (e.get("u") or "").startswith("http"): by[e["u"].split("#")[0]].append(e["id"])
    urls = [u for u, ids in by.items() if len(ids) <= 3][: a.limit]
    print(len(urls), "pages to try"); skipped = {}
    def go(u):
        try: return u, embedded(u)
        except urllib.error.HTTPError as e: skipped[u] = f"HTTP {e.code}" + (" (turns away the bot: do NOT bypass)" if e.code in (401, 403, 429) else ""); return u, None
        except Exception as e: skipped[u] = "error: " + type(e).__name__; return u, None
    with ThreadPoolExecutor(10) as ex: res = list(ex.map(go, urls))
    q = lambda s: "'" + s.replace("'", "''") + "'"
    lines = ["-- Event videos (scripts/video_pass.py): the player embedded on the event's own page"]
    for u, w in res:
        if w:
            for i in by[u]: lines.append(f"UPDATE events SET video={q(w)}, updated_at=datetime('now') WHERE id={q(i)} AND (video IS NULL OR video='');  -- {u}")
    open(a.out, "w").write("\n".join(lines) + "\n")
    print(sum(1 for _, w in res if w), "pages with a video ->", a.out, "|", len(skipped), "pages skipped (blocked or unreadable)")

if __name__ == "__main__": main()
