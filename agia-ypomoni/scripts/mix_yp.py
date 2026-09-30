"""Audio mix for the «Αγία Υπομονή» film.

  * narration loudness-matched (-17 LUFS every piece); nothing with words underneath it;
  * the nine clips without voices keep their own music, in sync with the picture (time-stretched with it on the
    slowed scenes, pitch kept), as a soft carpet ducked 9 dB whenever the narrator speaks;
  * the four clips that speak English (05, 07, 08, 12: Grok dialogue) are muted; their scenes get pads Paulstretch-ed
    from the neighbouring clips' music, keeping the key: 04's D major under her charity (05), 06's E-flat under the
    children (07), 09's E-flat into the tonsure (08), and 13's C minor / E-flat leading into the glory (12);
  * the ending: 13's own music swells right after the last word and fades out with the picture.
"""
import wave
import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from audio_lib import *
from plan_yp import *

CR = 100
LEN_S = END + 1.0
NS, NC = int(LEN_S * SR), int(LEN_S * CR)
tc = np.arange(NC) / CR
buses = {k: np.zeros((NS, 2)) for k in ('narr', 'clip')}
report = []
R = os.path.join(W, 'render')

def box(a, b, ramp):
    w = np.zeros(NC)
    w[(tc >= a) & (tc <= b)] = 1
    if ramp > 0:
        r = (tc > a - ramp) & (tc < a); w[r] = 0.5 - 0.5 * np.cos(np.pi * (tc[r] - (a - ramp)) / ramp)
        r = (tc > b) & (tc < b + ramp); w[r] = 0.5 + 0.5 * np.cos(np.pi * (tc[r] - b) / ramp)
    return w

def activity(wins, pre=0.3, post=0.5, merge=0.9):
    ws = sorted((a - pre, b + post) for a, b in wins)
    merged = []
    for a, b in ws:
        if merged and a - merged[-1][1] < merge: merged[-1][1] = max(merged[-1][1], b)
        else: merged.append([a, b])
    act = np.zeros(NC)
    for a, b in merged: act[max(0, int(a * CR)):min(NC, int(b * CR))] = 1
    out = np.zeros(NC); y = 0.0
    ka, kr = 1 - np.exp(-1 / (0.12 * CR)), 1 - np.exp(-1 / (0.45 * CR))
    for i in range(NC):
        y += (ka if act[i] > y else kr) * (act[i] - y); out[i] = y
    return out

def add(bus, x, t, env_db, fin=0.0, fout=0.0):
    x = x.copy(); L = len(x)
    if fin > 0:
        k = min(L, int(fin * SR)); x[:k] *= np.sin(np.linspace(0, np.pi / 2, k))[:, None]
    if fout > 0:
        k = min(L, int(fout * SR)); x[-k:] *= np.cos(np.linspace(0, np.pi / 2, k))[:, None]
    n0 = int(round(t * SR))
    ts = (n0 + np.arange(L)) / SR
    x *= db(np.interp(ts, tc, env_db))[:, None]
    a, b = max(0, n0), min(NS, n0 + L)
    if b > a: buses[bus][a:b] += x[a - n0:b - n0]

def level(x, target, lo=-24, hi=30):
    return float(np.clip(target - lufs(x), lo, hi))

def paulstretch(x, dur, win_s=0.32, seed=0):
    r = np.random.default_rng(seed)
    n = int(win_s * SR) // 2 * 2
    win = (1 - np.linspace(-1, 1, n) ** 2) ** 1.25
    hop_out = n // 4
    hop_in = hop_out / (dur * SR / max(len(x) - n, 1))
    nf = int(dur * SR / hop_out) + 2
    out = np.zeros((nf * hop_out + n, 2)); ws = np.zeros(nf * hop_out + n)
    for k in range(nf):
        p = min(int(k * hop_in), len(x) - n)
        S_ = np.fft.rfft(x[p:p + n] * win[:, None], axis=0)
        ph = np.exp(1j * r.uniform(0, 2 * np.pi, (S_.shape[0], 1)))
        y = np.fft.irfft(np.abs(S_) * ph, n=n, axis=0) * win[:, None]
        out[k * hop_out:k * hop_out + n] += y; ws[k * hop_out:k * hop_out + n] += win ** 2
    out = out / np.maximum(ws, ws.max() * 0.05)[:, None]
    return out[n // 2:n // 2 + int(dur * SR)]

def stretched(name):
    """The scene's stretch of its clip's own sound, slowed with the picture (rubberband, pitch kept)."""
    a, b, t0, t1 = SCENES[name][0]
    sp = (b - a) / (t1 - t0)
    af = f'atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS'
    if abs(sp - 1) > 1e-3:
        af += f',rubberband=tempo={sp:.6f}:transients=smooth:phase=laminar:window=long'
    p = subprocess.run([FF, '-v', 'error', '-i', os.path.join(DL, CLIPS[CLIPKEY[name]]), '-vn', '-af', af,
                        '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], check=True, capture_output=True)
    x = np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64).reshape(-1, 2)
    n = int(round((t1 - t0) * SR))
    return np.concatenate([x, np.zeros((max(0, n - len(x)), 2))])[:n]

# ------------------------------------------------------------------ narration
NARR_T, DUCK = -17.0, -9.0
speech_wins = []
for p, (fname, f0, f1) in NFILE.items():
    x = narr_audio(fname)
    g = NARR_T - lufs(x)
    f1 = len(x) / SR if f1 is None else f1
    part = seg(x, f0, f1) * db(g)
    k = int(0.012 * SR); part[:k] *= np.linspace(0, 1, k)[:, None]; part[-k:] *= np.linspace(1, 0, k)[:, None]
    place = narr[p]['place']
    speech_wins += [(place + a, place + b) for a, b in SPEECH[p]]
    n0 = int(round((place + f0) * SR))
    buses['narr'][n0:n0 + len(part)] += part
    report.append(f'narr {p}: gain {g:+.1f} dB at {place + f0:.3f}')
ACT = activity(speech_wins)

def bed(name, x, t, target, fin, fout, duck=DUCK, extra=(), lufs_ref=None, act=None):
    g = level(x if lufs_ref is None else lufs_ref, target)
    env = np.full(NC, g) + duck * (ACT if act is None else act)
    for a, b, gdb, ramp in extra:
        env = env + gdb * box(a, b, ramp)
    add('clip', x, t, env, fin, fout)
    report.append(f'bed {name}: {t:.2f}-{t + len(x) / SR:.2f}  gain {g:+.1f} dB')

def dissolve_in(n):
    i = ORDER.index(n)
    return FADE_IN if i == 0 else span(ORDER[i - 1] + n)[1] - span(ORDER[i - 1] + n)[0]

def dissolve_out(n):
    i = ORDER.index(n)
    return 0.012 if i == len(ORDER) - 1 else span(n + ORDER[i + 1])[1] - span(n + ORDER[i + 1])[0]

C = {n: clip_audio(CLIPKEY[n]) for n in ORDER}

# the nine scenes with music of their own: that music, in sync with the picture
BED_T = -29.0
for n in ORDER:
    if n in MUTED:
        continue
    x = stretched(n)
    extra = [(FINALE_T, END + 1.0, 8.0, 1.2)] if n == 'M' else []
    bed(f'{n} {CLIPKEY[n]} own music' + (f' (x{speed(n):.3f})' if abs(speed(n) - 1) > 1e-3 else ''), x, WIN[n][0],
        BED_T, dissolve_in(n), dissolve_out(n), extra=extra)

# the four scenes that speak English: pads from their neighbours' music, overlapping the dissolves
PADS = {'E': ('D', 2.5, 6.0, 'D major, 04'), 'G': ('F', 5.0, 10.04, 'E-flat, 06'), 'H': ('I', 2.5, 10.04, 'E-flat, 09'),
        'L': ('M', 2.5, 10.04, 'C minor / E-flat, 13')}
# 06 and 09 open near silence (8-12 dB under their own music for 3-5 s): the pad before each runs on over that opening
PAD_TAIL = {'E': 4.0, 'H': 3.0}
for k, (n, (src, a, b, what)) in enumerate(PADS.items()):
    t0, t1 = WIN[n]
    tail = PAD_TAIL.get(n, 0.0)
    t0, t1 = t0 - 0.35, t1 + 0.35 + tail
    x = paulstretch(seg(C[src], a, b), t1 - t0, seed=k + 1)
    bed(f'{n} pad ({what})' + (f', on {tail:.1f} s into {ORDER[ORDER.index(n) + 1]}' if tail else ''), x, t0, BED_T - 1.0,
        1.1, 2.6 if tail else 1.1, lufs_ref=x)

# 10 and 11 open 10-15 dB under their own music for 3-5 s: a bridge of the previous clip's music (same key) carries
# the carpet over the opening and fades as the clip's own music comes in
BRIDGES = {'J': ('I', 5.0, 10.04, 5.0, 'E-flat, 09'), 'K': ('J', 10.0, 15.04, 7.5, 'E-flat, 10')}
for k, (n, (src, a, b, into, what)) in enumerate(BRIDGES.items()):
    s0 = span(ORDER[ORDER.index(n) - 1] + n)[0] - 0.3
    t1 = WIN[n][0] + into
    x = paulstretch(seg(C[src], a, b), t1 - s0, seed=11 + k)
    bed(f'{n} bridge ({what})', x, s0, BED_T - 2.0, 0.9, 3.0, lufs_ref=x)

# ------------------------------------------------------------------ master
head = np.clip(np.arange(NS) / SR / FADE_IN, 0, 1)[:, None]
buses['clip'] *= np.sin(head * np.pi / 2)
mix = buses['narr'] + buses['clip']
tt = np.arange(NS) / SR
mix *= np.sin(np.clip((END - tt) / FADE_OUT, 0, 1) * np.pi / 2)[:, None]
mix = mix[:int(round(END * SR))]
L_int = lufs(mix)
mix *= db(-16.0 - L_int)
ceil = db(-1.5)
need = np.minimum(1.0, ceil / np.maximum(np.abs(mix).max(axis=1), 1e-9))
k = int(0.004 * SR)
g = np.minimum(uniform_filter1d(minimum_filter1d(need, 4 * k + 1, mode='nearest'), 2 * k + 1, mode='nearest'), 1.0)
g = np.minimum(g, minimum_filter1d(need, 2 * k + 1, mode='nearest'))
mix *= g[:, None]
report.append(f'program loudness before normalisation {L_int:.1f} LUFS; limiter max reduction {20 * np.log10(g.min()):.2f} dB')
report.append(f'final: {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.abs(mix).max()):.2f} dBFS')

out = os.path.join(R, 'mix.wav')
os.makedirs(R, exist_ok=True)
with wave.open(out, 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
s = db(-16.0 - L_int)
np.save(os.path.join(R, 'stem_narr.npy'), (buses['narr'][:len(mix)] * s).astype(np.float32))
np.save(os.path.join(R, 'stem_rest.npy'), (buses['clip'][:len(mix)] * s).astype(np.float32))
print('\n'.join(report))
