# contact sheet: one row per gesture dir, frames every STEP, scaled; python3 tools/zoom_sheet.py <run dir> <out.png> [step] [regex] [width]
import sys, os, re, json
from PIL import Image, ImageDraw
run, out = sys.argv[1], sys.argv[2]; step = int(sys.argv[3]) if len(sys.argv) > 3 else 8; rx = re.compile(sys.argv[4]) if len(sys.argv) > 4 else None; tw = int(sys.argv[5]) if len(sys.argv) > 5 else 120
rows = []
for d in sorted(os.listdir(run)):
    p = os.path.join(run, d)
    if not os.path.isdir(p) or (rx and not rx.search(d)): continue
    fs = sorted(f for f in os.listdir(p) if f.endswith('.png'))[::max(1, step // 2)]
    rows.append((d, p, fs))
if not rows: sys.exit('no rows')
th = int(tw * 860 / 412); cols = max(len(r[2]) for r in rows)
S = Image.new('RGB', (cols * (tw + 2) + 2, len(rows) * (th + 16) + 2), (40, 40, 40)); dr = ImageDraw.Draw(S)
for ri, (d, p, fs) in enumerate(rows):
    y = ri * (th + 16) + 2; dr.text((4, y), d, fill=(255, 255, 0))
    for ci, f in enumerate(fs):
        im = Image.open(os.path.join(p, f)).convert('RGB').resize((tw, th), Image.LANCZOS); S.paste(im, (ci * (tw + 2) + 2, y + 13)); dr.text((ci * (tw + 2) + 4, y + 14), f[1:4], fill=(0, 255, 0))
S.save(out); print(out, S.size)
