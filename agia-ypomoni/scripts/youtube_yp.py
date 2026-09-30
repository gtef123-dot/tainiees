"""YouTube extras for the «Αγία Υπομονή» film: the 1280x720 thumbnail (out/youtube/thumbnail.jpg, under 2 MB) and the
chapter list for the description, taken from the plan (the chapters are the TikTok parts).
Usage: youtube_yp.py [thumbnail source second on the timeline]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from tiktok_plan_yp import *

R = os.path.join(W, 'render')
OUTD = os.path.join(OUT, 'youtube')
os.makedirs(OUTD, exist_ok=True)
FONTS = '/usr/share/fonts/opentype/urw-base35'
PAL, PALB = os.path.join(FONTS, 'P052-Roman.otf'), os.path.join(FONTS, 'P052-Bold.otf')
GOLD = (232, 199, 122)


def frame(t, crop=(0, 0, 1920, 1080)):
    """The master's frame at t, cropped (x, y, w, h in 1080p pixels) and scaled to 1280x720."""
    x, y, w, h = crop
    p = subprocess.run([FF, '-v', 'error', '-ss', f'{t:.3f}', '-i', os.path.join(R, 'final_master.mp4'), '-frames:v', '1',
                        '-vf', f'crop={w}:{h}:{x}:{y},scale=in_color_matrix=bt709:in_range=tv:out_range=pc,'
                               f'scale=1280:720:flags=lanczos,format=rgb24',
                        '-f', 'rawvideo', '-'], capture_output=True, check=True)
    return Image.fromarray(np.frombuffer(p.stdout, np.uint8).reshape(720, 1280, 3).copy())


def text_with_shadow(im, xy, text, font, fill, anchor, blur=10, dark=210):
    sh = Image.new('L', im.size, 0)
    ImageDraw.Draw(sh).text((xy[0] + 3, xy[1] + 4), text, font=font, fill=dark, anchor=anchor)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    im.paste(Image.new('RGB', im.size, (0, 0, 0)), (0, 0), sh)
    ImageDraw.Draw(im).text(xy, text, font=font, fill=fill, anchor=anchor)


def thumbnail(t, crop=(0, 35, 1371, 771)):
    im = frame(t, crop)          # 1.4x: her face lands in the right half, the title sits on the crowd at the left
    # a soft dark band on the left for the title, the picture stays untouched on the right
    a = np.asarray(im, np.float32)
    x = np.arange(1280, dtype=np.float32)
    shade = np.clip(1 - 0.62 * np.clip((760 - x) / 520, 0, 1) ** 1.2, 0, 1)[None, :, None]
    im = Image.fromarray(np.clip(a * shade, 0, 255).astype(np.uint8))
    f1, f2, f3 = ImageFont.truetype(PALB, 104), ImageFont.truetype(PALB, 58), ImageFont.truetype(PAL, 40)
    text_with_shadow(im, (64, 290), 'ΑΓΙΑ', f1, GOLD, 'ls')
    text_with_shadow(im, (64, 400), 'ΥΠΟΜΟΝΗ', f1, GOLD, 'ls')
    text_with_shadow(im, (68, 486), 'Η αυτοκράτειρα', f2, (255, 255, 255), 'ls', blur=8)
    text_with_shadow(im, (68, 556), 'που έγινε μοναχή', f2, (255, 255, 255), 'ls', blur=8)
    text_with_shadow(im, (70, 640), 'Ελένη Δραγάση  ·  περ. 1372–1450', f3, (235, 225, 205), 'ls', blur=6)
    path = os.path.join(OUTD, 'thumbnail.jpg')
    im.save(path, quality=92)
    print('wrote', path, f'{os.path.getsize(path) / 1e6:.2f} MB')


def chapters():
    names = ['Ελένη Δραγάση, αυτοκράτειρα σε δύσκολους καιρούς', 'Ταπεινή και φιλάνθρωπη',
             'Η μητέρα του τελευταίου αυτοκράτορα', 'Από αυτοκράτειρα, μοναχή Υπομονή', 'Η υπομονή είναι δύναμη ψυχής']
    lines = []
    for P, name in zip(PARTS, names):
        s = int(P['v0'])
        lines.append(f'{s // 60}:{s % 60:02d} {name}')
    return lines


if __name__ == '__main__':
    thumbnail(float(sys.argv[1]) if len(sys.argv) > 1 else tl('L', 14.2))
    print('\n'.join(chapters()))
