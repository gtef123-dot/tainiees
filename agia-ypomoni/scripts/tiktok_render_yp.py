"""Render the TikTok parts of the «Αγία Υπομονή» film: 1080x1920, 24 fps, -14 LUFS / -1 dBFS, a cover per part.
Each part is encoded two-pass to stay under 25 MB, small enough to send straight to the phone (TikTok re-encodes
everything it gets anyway); --master also keeps a CRF 18 master of every part in out/tiktok/master.
Usage: tiktok_render_yp.py [--master] [part numbers...]
"""
import sys, wave
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from tiktok_plan_yp import *
from audio_lib import load, lufs, SR, db

OW, OH = 1080, 1920
R = os.path.join(W, 'render')
OUTD = os.path.join(OUT, 'tiktok')
TMP = os.path.join(R, 'tiktok')
os.makedirs(OUTD, exist_ok=True); os.makedirs(TMP, exist_ok=True)
FINAL = os.path.join(R, 'final_master.mp4')
FONTS = '/usr/share/fonts/opentype/urw-base35'
PAL, PALB = os.path.join(FONTS, 'P052-Roman.otf'), os.path.join(FONTS, 'P052-Bold.otf')     # URW's Palatino
GOLD = (232, 199, 122)
FSIZE = 1920 * 1080 * 3
TO_RGB = 'scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24'
BT709 = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']


def reader(path, k0, n, editlist=True):
    args = [FF, '-v', 'error'] + ([] if editlist else ['-ignore_editlist', '1'])
    if k0 > 0:
        args += ['-ss', f'{k0 / FPS - 0.001:.4f}']
    args += ['-i', path, '-frames:v', str(n), '-vf', TO_RGB, '-f', 'rawvideo', '-']
    p = subprocess.Popen(args, stdout=subprocess.PIPE)
    for _ in range(n):
        buf = p.stdout.read(FSIZE)
        if len(buf) < FSIZE:
            break
        yield np.frombuffer(buf, np.uint8).reshape(1080, 1920, 3)
    p.stdout.close(); p.wait()


# ------------------------------------------------------------------ text
def tracked(draw, font, text, y, fill, tracking, measure_only=False):
    widths = [font.getlength(ch) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    if measure_only:
        return total
    x = (OW - total) / 2
    for ch, wch in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill, anchor='ls')
        x += wch + tracking
    return total


def text_layer(items, scrim=None):
    """items: (text, font path, size, colour, baseline y, tracking) -> (rgb, alpha, y0) of the rows used."""
    mask_all = Image.new('L', (OW, OH), 0)
    premult = np.zeros((OH, OW, 3), np.float32)
    cover = np.zeros((OH, OW, 1), np.float32)
    for text, path, size, colour, y, tr in items:
        font = ImageFont.truetype(path, size)
        mk = Image.new('L', (OW, OH), 0); dm = ImageDraw.Draw(mk)
        while tracked(dm, font, text, y, 255, tr, True) > 960 and size > 30:
            size -= 2; font = ImageFont.truetype(path, size)
        tracked(dm, font, text, y, 255, tr)
        a = np.asarray(mk, np.float32)[..., None] / 255
        premult += a * np.array(colour, np.float32); cover += a
        mask_all = ImageChops.lighter(mask_all, mk)
    cover = np.clip(cover, 0, 1)
    sh = np.asarray(mask_all.filter(ImageFilter.GaussianBlur(9)), np.float32)[..., None] / 255
    sh = np.roll(sh, 3, axis=0) * 0.75
    alpha = cover + sh * (1 - cover)
    if scrim is not None:
        a0, a1, amax = scrim
        s = np.zeros((OH, 1, 1), np.float32)
        s[a0:a1, 0, 0] = np.linspace(0, 1, a1 - a0) ** 1.4 * amax
        alpha = alpha + s * (1 - alpha)
    rgb = premult / np.maximum(alpha, 1e-6)
    rows = np.where(alpha.max(axis=(1, 2)) > 0.002)[0]
    y0, y1 = rows.min(), rows.max() + 1
    return rgb[y0:y1], alpha[y0:y1], y0


def blend(img, layer, k=1.0):
    rgb, a, y0 = layer
    h = rgb.shape[0]
    a = a * k
    img[y0:y0 + h] = img[y0:y0 + h] * (1 - a) + rgb * a


def top_layer(k, title):
    return text_layer([(f'{SERIES}  ·  ΜΕΡΟΣ {k}/{NP}', PAL, 36, GOLD, 236, 5),
                       (title, PALB, 64, (255, 255, 255), 322, 1)])


def end_layer(k):
    return text_layer([(f'Συνέχεια στο Μέρος {k + 1}  »', PALB, 52, (255, 255, 255), FG_Y + 1080 - 70, 1)],
                      scrim=(FG_Y + 1080 - 330, FG_Y + 1080, 0.62))


# ------------------------------------------------------------------ picture
GRAD = np.full((OH, 1, 1), 0.46, np.float32)
yy = np.arange(OH, dtype=np.float32)
GRAD[:FG_Y, 0, 0] = 0.28 + 0.18 * yy[:FG_Y] / FG_Y
edge = 44
GRAD[FG_Y - edge:FG_Y, 0, 0] *= np.linspace(1, 0.55, edge)
GRAD[FG_Y + 1080:FG_Y + 1080 + edge, 0, 0] *= np.linspace(0.55, 1, edge)


def compose(fr, t):
    x0 = x0_of(t)
    bx0 = int(min(max(x0 + 540 - 304, 0), 1920 - 608))
    small = Image.fromarray(fr[:, bx0:bx0 + 608]).resize((135, 240), Image.BILINEAR).filter(ImageFilter.GaussianBlur(3.5))
    img = np.asarray(small.resize((OW, OH), Image.BICUBIC), dtype=np.float32) * GRAD
    img[FG_Y:FG_Y + 1080] = fr[:, x0:x0 + 1080]
    return img


# ------------------------------------------------------------------ sound
MIX = load(os.path.join(R, 'mix.wav'))


def part_audio(P, dur, path):
    a0 = P['v0']
    n = int(round(dur * SR))
    x = MIX[int(round(a0 * SR)):int(round(a0 * SR)) + n].copy()
    if len(x) < n:
        x = np.concatenate([x, np.zeros((n - len(x), 2))])
    if P['ain'] > 0:
        k = int(P['ain'] * SR); x[:k] *= np.sin(np.linspace(0, np.pi / 2, k))[:, None]
    e = min(n, int(round((P['a_end'] - a0) * SR)))              # fully faded by a_end, silence after
    if P['aout'] > 0:
        k = int(P['aout'] * SR)
        x[e - k:e] *= np.cos(np.linspace(0, np.pi / 2, k))[:, None]
    x[e:] = 0
    x *= db(-14.0 - lufs(x))
    ceil = db(-1.0)
    need = np.minimum(1.0, ceil / np.maximum(np.abs(x).max(axis=1), 1e-9))
    kk = int(0.004 * SR)
    g = np.minimum(uniform_filter1d(minimum_filter1d(need, 4 * kk + 1, mode='nearest'), 2 * kk + 1, mode='nearest'), 1)
    g = np.minimum(g, minimum_filter1d(need, 2 * kk + 1, mode='nearest'))
    x *= g[:, None]
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
        wf.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    return lufs(x), 20 * np.log10(np.abs(x).max())


def overrides(P):
    """film frame index -> frame, read from the scenes' own files (no transition from the neighbouring part)."""
    ov = {}
    for scene, t0, t1 in P['over']:
        g0, g1 = int(round(t0 * FPS)), int(round(t1 * FPS))
        s0 = int(round(WIN[scene][0] * FPS))
        for j, fr in enumerate(reader(os.path.join(R, f'scene_{scene}.mp4'), g0 - s0, g1 - g0, editlist=False)):
            ov[g0 + j] = fr
    return ov


def part_name(k):
    return f'{NAME.replace(" ", "_")}_Meros_{k}_apo_{NP}'


def render_part(i, keep_master=False):
    P = PARTS[i]; k = i + 1
    f0, f1 = int(round(P['v0'] * FPS)), int(round(P['v1'] * FPS))
    n_main = f1 - f0; n_tail = int(round(P['tail'] * FPS)); n = n_main + n_tail; dur = n / FPS
    name = part_name(k)
    wav = os.path.join(TMP, name + '.wav')
    L, pk = part_audio(P, dur, wav)
    top = top_layer(k, P['title'])
    endl = end_layer(k) if k < NP else None
    t_end_card = n_main / FPS - 2.6
    ov = overrides(P)
    master = os.path.join(TMP, name + '_master.mp4')
    enc = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS),
                            '-i', '-', '-i', wav, '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high', '-level', '4.1',
                            '-maxrate', '14M', '-bufsize', '28M'] + BT709 +
                           ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', master],
                           stdin=subprocess.PIPE)
    src = reader(FINAL, f0, n_main)
    last = None
    for j in range(n):
        if j < n_main:
            fr = next(src)
            fr = ov.get(f0 + j, fr)
            last = fr
        else:
            fr = last
        t = (f0 + min(j, n_main - 1)) / FPS
        img = compose(fr, t)
        tr = j / FPS
        if P['vfade'] > 0 and tr > dur - P['vfade']:
            img *= max(0.0, (dur - tr) / P['vfade'])
        blend(img, top)
        if endl is not None and tr >= t_end_card:
            blend(img, endl, min(1.0, (tr - t_end_card) / 0.35))
        enc.stdin.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
    enc.stdin.close(); enc.wait()
    out = os.path.join(OUTD, name + '.mp4')
    phone_copy(master, out, dur)
    if keep_master:
        os.makedirs(os.path.join(OUTD, 'master'), exist_ok=True)
        os.replace(master, os.path.join(OUTD, 'master', name + '.mp4'))
    os.remove(wav)
    print(f'part {k}: {dur:.2f} s, {n} frames, {L:.1f} LUFS, peak {pk:.1f} dBFS -> {out} ({os.path.getsize(out) / 1e6:.1f} MB)',
          flush=True)
    return out


def phone_copy(master, out, dur, target_mb=23.0):
    vb = min(6000, int((target_mb * 8e6 / dur - 128e3) / 1000))
    log = os.path.join(TMP, 'x264_2pass')
    for pas in (1, 2):
        run(['-i', master, '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{vb}k', '-maxrate', f'{int(vb * 1.5)}k',
             '-bufsize', f'{vb * 2}k', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-pass', str(pas), '-passlogfile', log]
            + BT709 + (['-an', '-f', 'mp4', os.devnull] if pas == 1 else
                       ['-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]))


def render_cover(i):
    t = COVER_T[i]
    fr = next(reader(FINAL, int(round(t * FPS)), 1))
    img = compose(fr, t)
    blend(img, top_layer(i + 1, PARTS[i]['title']))
    path = os.path.join(OUTD, f'{NAME.replace(" ", "_")}_Meros_{i + 1}_cover.jpg')
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(path, quality=93)


if __name__ == '__main__':
    keep = '--master' in sys.argv
    which = [int(a) - 1 for a in sys.argv[1:] if a != '--master'] or list(range(NP))
    for i in which:
        render_cover(i)
        render_part(i, keep)
