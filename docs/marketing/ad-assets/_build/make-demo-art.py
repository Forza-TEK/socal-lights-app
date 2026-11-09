"""Draws six simple, made-up night 'home' illustrations (own artwork, no photos) used as demo entry pictures
in the LOCAL demo contest, so no stock photo or real home appears in the ad images.
Usage: python3 make-demo-art.py <outDir>   -> home-1.jpg .. home-6.jpg (1024x640)"""
import sys, random, math
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]
PAL = [((255, 80, 80), (80, 220, 120), (255, 220, 90)), ((90, 170, 255), (255, 255, 255), (170, 120, 255)),
       ((255, 150, 60), (255, 230, 120), (255, 90, 90)), ((120, 255, 200), (255, 255, 255), (90, 160, 255)),
       ((255, 100, 180), (255, 220, 100), (120, 200, 255)), ((255, 255, 255), (255, 210, 120), (255, 120, 120))]
W, H = 1024, 640
for n in range(6):
    random.seed(n * 7 + 3)
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=(int(10 + 25 * t), int(14 + 20 * t), int(40 + 45 * t)))
    for _ in range(70):
        x, y = random.randint(0, W), random.randint(0, 260); d.ellipse([x, y, x + 2, y + 2], fill=(255, 255, 230))
    d.rectangle([0, 500, W, H], fill=(18, 24, 22))
    hx = 150 + (n % 3) * 30; hw = 520; top = 270
    d.rectangle([hx, top + 70, hx + hw, 500], fill=(34, 32, 46))
    roof = [(hx - 30, top + 80), (hx + hw / 2, top - 20), (hx + hw + 30, top + 80)]
    d.polygon(roof, fill=(26, 24, 36))
    for wx in (hx + 50, hx + 330):
        d.rectangle([wx, 380, wx + 130, 460], fill=(255, 205, 110)); d.line([(wx + 65, 380), (wx + 65, 460)], fill=(34, 32, 46), width=4)
    d.rectangle([hx + 230, 400, hx + 290, 500], fill=(120, 70, 50))
    cols = PAL[n]
    glow = Image.new("RGB", (W, H), (0, 0, 0)); g = ImageDraw.Draw(glow)
    def bulb(x, y, c, r=6):
        g.ellipse([x - r * 2, y - r * 2, x + r * 2, y + r * 2], fill=tuple(int(v * .55) for v in c))
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    def line(p, q, step):
        k = int(math.dist(p, q) / step)
        for i in range(k + 1):
            t = i / max(k, 1); bulb(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, cols[i % 3])
    line(roof[0], roof[1], 22); line(roof[1], roof[2], 22); line((hx, 500), (hx + hw, 500), 22) if n % 2 else line((hx, top + 80), (hx + hw, top + 80), 22)
    tx = hx + hw + 130
    d.polygon([(tx - 90, 500), (tx, 250), (tx + 90, 500)], fill=(14, 50, 34))
    for i in range(60):
        yy = random.randint(270, 495); half = (yy - 250) / 250 * 90; xx = tx + random.uniform(-half, half) * .9
        bulb(xx, yy, cols[i % 3], 5)
    glow = glow.filter(ImageFilter.GaussianBlur(14)); im = Image.blend(im, Image.eval(Image.composite(glow, im, Image.new("L", (W, H), 255)), lambda v: v), 0)
    from PIL import ImageChops
    im = ImageChops.add(im, glow)
    im.save(f"{out}/home-{n + 1}.jpg", quality=88)
