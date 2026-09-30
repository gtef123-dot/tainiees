"""Review sheets (work/render):
  film_sheet.jpg     every scene at its start, middle and end, and every dissolve at its centre
  tiktok_crops.jpg   film frames every 2.5 s with the planned 1:1 TikTok window in red (covers in yellow)
Usage: qa_yp.py [film.mp4]   (default: the master)
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from tiktok_plan_yp import *

R = os.path.join(W, 'render')
F_ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, 'final_master.mp4')


def grab(t, w=384):
    h = w * 9 // 16
    p = subprocess.run([FF, '-v', 'error', '-ss', f'{max(0.0, t):.4f}', '-i', F_, '-frames:v', '1', '-vf', f'scale={w}:{h}',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    return Image.fromarray(np.frombuffer(p.stdout, np.uint8).reshape(h, w, 3).copy())


def sheet(tiles, cols, path):
    w, h = tiles[0].size
    s = Image.new('RGB', (w * cols, h * ((len(tiles) + cols - 1) // cols)))
    for i, im in enumerate(tiles):
        s.paste(im, ((i % cols) * w, (i // cols) * h))
    s.save(path, quality=84)
    print(path, len(tiles), 'frames')


tiles = []
for n in ORDER:
    t0, t1 = WIN[n]
    for lab, t in (('in', t0 + 0.9), ('mid', (t0 + t1) / 2), ('out', t1 - 0.9)):
        im = grab(t)
        ImageDraw.Draw(im).text((5, 4), f'{n} {CLIPKEY[n]} {lab} {t:.2f}', fill=(255, 255, 0))
        tiles.append(im)
for key in T:
    im = grab(T[key][1])
    ImageDraw.Draw(im).text((5, 4), f'dissolve {key} {T[key][1]:.2f}', fill=(0, 255, 255))
    tiles.append(im)
sheet(tiles, 6, os.path.join(R, 'film_sheet.jpg'))

tiles = []
for t in list(np.arange(1.0, END - 0.5, 2.5)) + COVER_T:
    im = grab(t, 320)
    d = ImageDraw.Draw(im)
    x0 = x0_of(t) / 6
    d.rectangle([x0, 0, x0 + 180, 179], outline=(255, 210, 0) if t in COVER_T else (255, 40, 40), width=3)
    d.text((5, 4), f'{t:.1f}', fill=(255, 255, 0))
    tiles.append(im)
sheet(tiles, 8, os.path.join(R, 'tiktok_crops.jpg'))
