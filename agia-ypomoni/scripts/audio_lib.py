from common import *
import numpy as np
from scipy.signal import lfilter
SR = 48000
_cache = {}
def load(path, mono=False):
    """Decode any media file to float64 48 kHz stereo (N, 2)."""
    key = (path, mono)
    if key in _cache: return _cache[key]
    p = subprocess.run([FF, '-v', 'error', '-i', path, '-vn', '-ac', '1' if mono else '2', '-ar', str(SR), '-f', 'f32le', '-'],
                       check=True, capture_output=True)
    x = np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)
    x = x.reshape(-1, 1) if mono else x.reshape(-1, 2)
    if mono: x = np.repeat(x, 2, axis=1)
    _cache[key] = x
    return x
def clip_audio(k): return load(os.path.join(DL, CLIPS[k]))
def narr_audio(name): return load(os.path.join(DL, NARR[name]), mono=True)
# ITU-R BS.1770 K-weighting @48k
_B1, _A1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
_B2, _A2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
def kweight(x):
    return lfilter(_B2, _A2, lfilter(_B1, _A1, x, axis=0), axis=0)
def lufs(x, gated=True):
    """Integrated loudness (LUFS) of a (N,2) signal."""
    z = kweight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if len(z) < blk:
        ms = np.mean(np.sum(z ** 2, axis=1)); return -0.691 + 10 * np.log10(ms + 1e-20)
    e = np.array([np.mean(np.sum(z[i:i + blk] ** 2, axis=1)) for i in range(0, len(z) - blk + 1, hop)])
    l = -0.691 + 10 * np.log10(e + 1e-20)
    if not gated: return -0.691 + 10 * np.log10(np.mean(e) + 1e-20)
    e1 = e[l > -70]
    if len(e1) == 0: return -99.0
    rel = -0.691 + 10 * np.log10(np.mean(e1)) - 10
    e2 = e[(l > -70) & (l > rel)]
    return -0.691 + 10 * np.log10(np.mean(e2) + 1e-20)
def short_term(x, win=3.0, hop=0.5):
    z = kweight(x); n = int(win * SR); h = int(hop * SR)
    return [(i / SR, -0.691 + 10 * np.log10(np.mean(np.sum(z[i:i + n] ** 2, axis=1)) + 1e-20)) for i in range(0, max(1, len(z) - n), h)]
def seg(x, a, b): return x[int(round(a * SR)):int(round(b * SR))]
def db(g): return 10 ** (g / 20)
