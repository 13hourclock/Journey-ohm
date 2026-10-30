import numpy as np, math, colorsys, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 800
GOLD = math.radians(137.50776)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONTB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def hsv(h, s, v, a=255):
    r, g, b = colorsys.hsv_to_rgb(h % 1, max(0, min(1, s)), max(0, min(1, v)))
    return (int(r * 255), int(g * 255), int(b * 255))

def bg_grad(c1, c2):
    y = np.linspace(0, 1, S)[:, None, None]
    x = np.linspace(-1, 1, S)[None, :, None]
    base = np.array(c1) * (1 - y) + np.array(c2) * y
    vign = 1 - 0.35 * (x ** 2)
    return base * vign * np.ones((S, S, 3))

def glowify(img, bg, extra=None):
    a = np.asarray(img).astype(np.float32)
    g1 = np.asarray(img.filter(ImageFilter.GaussianBlur(5))).astype(np.float32)
    g2 = np.asarray(img.filter(ImageFilter.GaussianBlur(20))).astype(np.float32)
    out = bg + a * 0.9 + g1 * 1.2 + g2 * 1.5
    if extra is not None:
        out += extra
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

# ---------- tree from a "jam" ----------
def grow(d, x, y, ang, length, depth, jam, rng, tips, width):
    if depth == 0 or length < 3:
        tips.append((x, y, ang, depth))
        return
    x2 = x + length * math.cos(ang)
    y2 = y - length * math.sin(ang)
    lvl = jam["depth"] - depth
    col = hsv(jam["bark_hue"] + 0.015 * lvl, jam["bark_sat"], 0.28 + 0.07 * lvl)
    d.line([(x, y), (x2, y2)], fill=col, width=max(1, int(width)))
    r = jam["ratios"][depth % len(jam["ratios"])]       # harmony -> split angle
    spread = jam["spread"] * (r - 1) * 2
    nb = jam["branches"][depth % len(jam["branches"])]
    for k in range(nb):
        t = (k / (nb - 1) - 0.5) if nb > 1 else 0
        beat = jam["rhythm"][(depth * 3 + k) % len(jam["rhythm"])]  # rhythm -> length
        a2 = ang + t * 2 * spread + jam["lean"] * (lvl % 2 * 2 - 1) * 0.08 + rng.uniform(-1, 1) * jam["swing"]
        L = length * jam["shrink"] * (0.82 + 0.28 * beat)
        if depth > 1 and rng.random() < jam["tip_bloom"]:
            tips.append((x2, y2, ang, depth))
        grow(d, x2, y2, a2, L, depth - 1, jam, rng, tips, width * 0.7)

# ---------- bloom generators ----------
def sunflower(d, x, y, R, hue, ang=GOLD, n=None):
    n = n or int(R * 5)
    for i in range(n):
        f = i / n
        r = R * math.sqrt(f)
        th = i * ang
        px, py = x + r * math.cos(th), y + r * math.sin(th)
        s = 0.5 + 1.6 * f
        c = hsv(hue + 0.12 * f, 0.75 - 0.3 * f, 0.6 + 0.4 * (1 - f))
        d.ellipse([px - s, py - s, px + s, py + s], fill=c)

def flower_of_life(d, x, y, R, hue, rings=1, w=1):
    pts = [(0, 0)]
    for ring in range(1, rings + 1):
        for k in range(6 * ring):
            a = k * 2 * math.pi / (6 * ring)
            pts.append((ring * R * math.cos(a), ring * R * math.sin(a)))
    for i, (px, py) in enumerate(pts):
        c = hsv(hue + 0.03 * i, 0.55, 0.85)
        d.ellipse([x + px - R, y + py - R, x + px + R, y + py + R], outline=c, width=w)
    big = R * (rings + 1)
    d.ellipse([x - big, y - big, x + big, y + big], outline=hsv(hue, 0.4, 0.9), width=w)

def metatron(d, x, y, R, hue):
    pts = [(x, y)]
    for ring in (1, 2):
        for k in range(6):
            a = k * math.pi / 3 + math.pi / 6
            pts.append((x + ring * R * math.cos(a), y + ring * R * math.sin(a)))
    c = hsv(hue, 0.35, 0.5)
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            d.line([pts[i], pts[j]], fill=c, width=1)

def fern(d, x, y, size, ang, hue, rng, n=2600):
    pts = np.zeros((n, 2)); p = np.zeros(2)
    for i in range(n):
        r = rng.random()
        if r < 0.01:   p = np.array([0, 0.16 * p[1]])
        elif r < 0.86: p = np.array([0.85 * p[0] + 0.04 * p[1], -0.04 * p[0] + 0.85 * p[1] + 1.6])
        elif r < 0.93: p = np.array([0.2 * p[0] - 0.26 * p[1], 0.23 * p[0] + 0.22 * p[1] + 1.6])
        else:          p = np.array([-0.15 * p[0] + 0.28 * p[1], 0.26 * p[0] + 0.24 * p[1] + 0.44])
        pts[i] = p
    pts /= 10.0
    a = ang - math.pi / 2
    ca, sa = math.cos(a), math.sin(a)
    for i, (px, py) in enumerate(pts):
        rx = px * ca - py * sa; ry = px * sa + py * ca
        c = hsv(hue + 0.15 * py, 0.7, 0.45 + 0.5 * py)
        d.point((x + rx * size, y - ry * size), fill=c)

def flame(n, seed, c1, c2, sym=6):
    rng = np.random.default_rng(seed)
    K = 3
    A = rng.uniform(-0.9, 0.9, (K, 6))
    cols = np.linspace(0, 1, K)
    var = rng.permutation(3)
    N = 120000
    P = rng.uniform(-1, 1, (N, 2)); C = rng.uniform(0, 1, N)
    H = np.zeros(n * n); Cc = np.zeros(n * n)
    for it in range(28):
        k = rng.integers(0, K, N)
        x, y = P[:, 0], P[:, 1]; a = A[k]
        nx = a[:, 0] * x + a[:, 1] * y + a[:, 2]
        ny = a[:, 3] * x + a[:, 4] * y + a[:, 5]
        v = var[k]; r2 = nx * nx + ny * ny + 1e-6
        sx = np.where(v == 0, np.sin(nx), np.where(v == 1, nx / r2, nx * np.sin(r2) - ny * np.cos(r2)))
        sy = np.where(v == 0, np.sin(ny), np.where(v == 1, ny / r2, nx * np.cos(r2) + ny * np.sin(r2)))
        bad = ~np.isfinite(sx) | ~np.isfinite(sy) | (np.abs(sx) > 50) | (np.abs(sy) > 50)
        sx[bad] = rng.uniform(-1, 1, bad.sum()); sy[bad] = rng.uniform(-1, 1, bad.sum())
        P = np.stack([sx, sy], 1); C = (C + cols[k]) / 2
        if it > 8:
            for s in range(sym):
                th = 2 * math.pi * s / sym
                rx = P[:, 0] * math.cos(th) - P[:, 1] * math.sin(th)
                ry = P[:, 0] * math.sin(th) + P[:, 1] * math.cos(th)
                ix = ((rx * 0.33 + 0.5) * n).astype(int); iy = ((ry * 0.33 + 0.5) * n).astype(int)
                m = (ix >= 0) & (ix < n) & (iy >= 0) & (iy < n)
                idx = iy[m] * n + ix[m]
                H += np.bincount(idx, minlength=n * n); Cc += np.bincount(idx, weights=C[m], minlength=n * n)
    H = H.reshape(n, n); Cc = Cc.reshape(n, n)
    col = np.where(H > 0, Cc / np.maximum(H, 1), 0)[..., None]
    alpha = (np.log1p(H) / np.log1p(H.max())) ** 0.55
    rgb = (np.array(c1) * (1 - col) + np.array(c2) * col) * alpha[..., None]
    # soft circular falloff
    yy, xx = np.mgrid[-1:1:n * 1j, -1:1:n * 1j]
    rgb *= (np.clip(1 - np.sqrt(xx ** 2 + yy ** 2), 0, 1) ** 1.8)[..., None]
    return rgb

def paste_add(buf, img, cx, cy):
    n = img.shape[0]; x0 = int(cx - n / 2); y0 = int(cy - n / 2)
    xs, ys = max(0, x0), max(0, y0); xe, ye = min(S, x0 + n), min(S, y0 + n)
    buf[ys:ye, xs:xe] += img[ys - y0:ye - y0, xs - x0:xe - x0]

def label(img, title, sub):
    d = ImageDraw.Draw(img)
    d.text((24, 20), title, font=ImageFont.truetype(FONTB, 30), fill=(240, 236, 225))
    d.text((24, 58), sub, font=ImageFont.truetype(FONT, 17), fill=(185, 180, 170))
    return img

# ---------- four looks ----------
def look_golden():
    rng = random.Random(7)
    jam = dict(depth=9, ratios=[3/2, 5/4, 4/3], branches=[2, 2, 3], rhythm=[1, 0, 1, 1, 0, 1, 0, 1],
               spread=0.75, shrink=0.73, swing=0.05, lean=1, bark_hue=0.08, bark_sat=0.45, tip_bloom=0.0)
    img = Image.new("RGB", (S, S)); d = ImageDraw.Draw(img); tips = []
    grow(d, S / 2, S - 50, math.pi / 2, 150, jam["depth"], jam, rng, tips, 16)
    rng.shuffle(tips)
    for i, (x, y, a, dep) in enumerate(tips[:46]):
        R = 9 + (i % 5) * 4
        sunflower(d, x, y, R, 0.09 + 0.04 * (i % 3), ang=GOLD + 0.002 * (i % 4))
    sunflower(d, S / 2, 250, 60, 0.07, n=520)
    out = glowify(img, bg_grad((30, 18, 8), (6, 4, 2)))
    return label(out, "Golden Spiral", "Jam: major, heavy 3:2 fifths, steady groove  ·  sunflower blooms")

def look_fern():
    rng = random.Random(3)
    jam = dict(depth=7, ratios=[4/3, 6/5, 3/2], branches=[3, 2, 3], rhythm=[1, 0.3, 0.6, 0, 1, 0.5],
               spread=1.0, shrink=0.74, swing=0.12, lean=0.6, bark_hue=0.38, bark_sat=0.5, tip_bloom=0.0)
    img = Image.new("RGB", (S, S)); d = ImageDraw.Draw(img); tips = []
    grow(d, S / 2, S - 50, math.pi / 2, 155, jam["depth"], jam, rng, tips, 14)
    rng.shuffle(tips)
    nrng = np.random.default_rng(1)
    for i, (x, y, a, dep) in enumerate(tips[:60]):
        fern(d, x, y, 34 + 10 * (i % 3), a + rng.uniform(-0.4, 0.4), 0.33 + 0.05 * (i % 2), nrng, n=900)
    for (x, y, a, dep) in tips[60:85]:
        sunflower(d, x, y, 7, 0.5, n=40)
    out = glowify(img, bg_grad((4, 22, 24), (2, 6, 8)))
    return label(out, "Fern Choir", "Jam: dorian minor, syncopated, many voices  ·  fern-fractal fronds")

def look_life():
    rng = random.Random(11)
    jam = dict(depth=8, ratios=[3/2, 4/3], branches=[2], rhythm=[1, 1, 1, 1],
               spread=0.8, shrink=0.74, swing=0.0, lean=0, bark_hue=0.72, bark_sat=0.35, tip_bloom=0.0)
    img = Image.new("RGB", (S, S)); d = ImageDraw.Draw(img)
    metatron(d, S / 2, 300, 95, 0.7)
    flower_of_life(d, S / 2, 300, 48, 0.68, rings=2, w=1)
    tips = []
    grow(d, S / 2, S - 50, math.pi / 2, 150, jam["depth"], jam, rng, tips, 14)
    for i, (x, y, a, dep) in enumerate(tips[::4]):
        flower_of_life(d, x, y, 6 + 2 * (i % 3), 0.75 + 0.03 * (i % 4), rings=1)
    out = glowify(img, bg_grad((14, 8, 34), (3, 2, 10)))
    return label(out, "Flower of Life", "Jam: perfect sync, octaves + fifths  ·  symmetric sacred geometry")

def look_flame():
    rng = random.Random(5)
    jam = dict(depth=8, ratios=[3/2, 7/4, 5/4], branches=[2, 3, 2], rhythm=[1, 0, 0, 1, 0, 1, 1, 0],
               spread=0.8, shrink=0.75, swing=0.1, lean=1, bark_hue=0.95, bark_sat=0.4, tip_bloom=0.0)
    img = Image.new("RGB", (S, S)); d = ImageDraw.Draw(img); tips = []
    grow(d, S / 2, S - 50, math.pi / 2, 160, jam["depth"], jam, rng, tips, 15)
    add = np.zeros((S, S, 3))
    rng.shuffle(tips)
    picks = sorted(tips, key=lambda t: t[1])[:120]
    rng.shuffle(picks)
    for i, (x, y, a, dep) in enumerate(picks[:7]):
        f = flame(150 + 30 * (i % 3), 40 + i, (255, 70, 150), (255, 190, 60), sym=5 + i % 3)
        paste_add(add, f * 2.2, x, y)
    big = flame(360, 99, (180, 60, 255), (255, 120, 60), sym=7)
    paste_add(add, big * 1.3, S / 2, 300)
    for (x, y, a, dep) in tips[7:70]:
        sunflower(d, x, y, 4, 0.92, n=14)
    out = glowify(img, bg_grad((26, 6, 20), (5, 2, 6)), extra=add)
    return label(out, "Flame Heart", "Jam: bluesy 7:4, peak climax  ·  baked flame-fractal blooms")

if __name__ == "__main__":
    panels = [look_golden(), look_fern(), look_life(), look_flame()]
    for p, name in zip(panels, ["golden", "fern", "life", "flame"]):
        p.save(f"tree_{name}.png")
    sheet = Image.new("RGB", (S * 2 + 12, S * 2 + 12), (0, 0, 0))
    for i, p in enumerate(panels):
        sheet.paste(p, ((i % 2) * (S + 12), (i // 2) * (S + 12)))
    sheet.save("tree_previews.png")
    print("ok")
