"""robots.txt courtesy for the scripts that read other sites (SoCalLightsBot; same rules as functions/_lib/robots.js).
allowed(url) is True when the site's robots.txt lets SoCalLightsBot read the URL. A missing file or any 4xx means no restrictions, a server error or no answer means unknown (allowed, not cached).
Used by photo_pass.py and video_pass.py: `fetch_ok(url)` raises PermissionError when robots.txt disallows the page, which the callers report instead of fetching."""
import time, urllib.parse, urllib.request, urllib.robotparser

UA_ROBOTS = "Mozilla/5.0 (compatible; SoCalLightsBot/1.0; +https://socallights.app/bot)"
_cache = {}  # origin -> (parser or None, fetched_at)

def _parser(origin):
    hit = _cache.get(origin)
    if hit and time.time() - hit[1] < 3600: return hit[0]
    rp = urllib.robotparser.RobotFileParser()
    try:
        data = urllib.request.urlopen(urllib.request.Request(origin + "/robots.txt", headers={"User-Agent": UA_ROBOTS}), timeout=6).read(500_000).decode("utf8", "ignore")
        rp.parse(data.splitlines())
    except urllib.error.HTTPError as e:
        if 400 <= e.code < 500: rp = None            # no file (or behind a wall): nothing we can read, no restrictions
        else: return None                            # server error: unknown, do not cache
    except Exception:
        return None
    _cache[origin] = (rp, time.time())
    return rp

def allowed(url):
    u = urllib.parse.urlparse(url)
    if u.scheme not in ("http", "https") or not u.netloc: return True
    rp = _parser(f"{u.scheme}://{u.netloc}")
    return True if rp is None else rp.can_fetch("SoCalLightsBot", url)

def fetch_ok(url):
    if not allowed(url): raise PermissionError("robots.txt disallows " + url)
