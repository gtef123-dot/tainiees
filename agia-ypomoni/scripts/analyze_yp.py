"""Measurements the plan and the mix are built on.

  * narration: loudness, peak, and the speech segments of every file (the same energy VAD as vad.py);
  * clips: loudness of the clip's own sound, its short-term range, and its pitch classes (beds.py), per region,
    to pick pad material that shares a key with its neighbours.
Writes work/analysis/measure.json and prints a report.
"""
import json
import numpy as np
from audio_lib import *

NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def speech_segments(x, thr_db=-42, hop=0.01, min_sil=0.18, min_len=0.12):
    m = x.mean(axis=1)
    h = int(SR * hop); n = len(m) // h
    r = np.sqrt(np.mean(m[:n * h].reshape(n, h) ** 2, axis=1) + 1e-12)
    act = 20 * np.log10(r) > thr_db
    segs, i = [], 0
    while i < n:
        if act[i]:
            j = i
            while j < n and act[j]: j += 1
            segs.append([i * hop, j * hop]); i = j
        else:
            i += 1
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_sil: merged[-1][1] = s[1]
        else: merged.append(s)
    return [(round(a, 2), round(b, 2)) for a, b in merged if b - a >= min_len]


def chroma(x):
    x = x.mean(axis=1)
    win, hop = 16384, 4096
    acc = np.zeros(12)
    f = np.fft.rfftfreq(win, 1 / SR)
    m = (f > 70) & (f < 1800)
    pc = np.round(12 * np.log2(f[m] / 261.63)).astype(int) % 12
    for i in range(0, max(1, len(x) - win), hop):
        S = np.abs(np.fft.rfft(x[i:i + win] * np.hanning(win)))
        np.add.at(acc, pc, S[m] ** 2)
    acc /= acc.max() + 1e-20
    return acc


def top(acc, k=5):
    return ' '.join(f'{NAMES[i]}:{acc[i]:.2f}' for i in np.argsort(acc)[::-1][:k])


if __name__ == '__main__':
    res = {'narr': {}, 'clips': {}}
    print('--- narration')
    for k in NARR:
        x = narr_audio(k)
        sp = speech_segments(x)
        res['narr'][k] = dict(dur=len(x) / SR, lufs=lufs(x), peak=20 * np.log10(np.abs(x).max()), speech=sp)
        print(f'{k:5s} {len(x) / SR:6.2f}s {lufs(x):6.1f} LUFS  peak {20 * np.log10(np.abs(x).max()):5.1f}  '
              f'speech {sp[0][0]:.2f}-{sp[-1][1]:.2f}  pauses ' +
              ' '.join(f'{b0:.2f}-{a1:.2f}' for (_, b0), (a1, _) in zip(sp[:-1], sp[1:]) if a1 - b0 >= 0.3))
    print('--- clips (own sound)')
    for k in CLIPS:
        x = clip_audio(k)
        d = len(x) / SR
        st = short_term(x, 1.0, 0.5)
        regions = []
        for a in np.arange(0, d - 0.5, 2.5):
            b = min(d, a + 2.5)
            s = seg(x, a, b)
            regions.append(dict(a=round(float(a), 2), b=round(float(b), 2), lufs=round(lufs(s), 1), chroma=top(chroma(s), 3)))
        res['clips'][k] = dict(dur=d, lufs=lufs(x), peak=20 * np.log10(np.abs(x).max() + 1e-12),
                               st=[(round(t, 2), round(v, 1)) for t, v in st], chroma=top(chroma(x)), regions=regions)
        print(f'{k:9s} {d:6.2f}s {lufs(x):6.1f} LUFS  short-term {min(v for _, v in st):6.1f}..{max(v for _, v in st):6.1f}'
              f'   {top(chroma(x))}')
        print('           ' + ' | '.join(f"{r['a']:.1f}-{r['b']:.1f} {r['lufs']:.0f} {r['chroma']}" for r in regions))
    os.makedirs(os.path.join(W, 'analysis'), exist_ok=True)
    json.dump(res, open(os.path.join(W, 'analysis', 'measure.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
