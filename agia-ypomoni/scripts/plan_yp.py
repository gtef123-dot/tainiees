"""Edit decision list for the «Αγία Υπομονή» film (clips yp1..yp13, narration υπ1..υπ13) — Claude's version.

There is no CapCut draft for this one, so the order is the files' own: clip N carries narration N (each clip was
made to its narration's length: the 15 s clips go with the 13-15 s narrations, the 6 s clips with the 6.6-6.8 s ones).
Nothing is slowed down for effect, so there are no drawn impact scenes. Four clips speak English (Grok dialogue:
yp5, yp7, yp8, yp12) right under where the Greek narration goes, so those four are muted and get pads (mix_yp).
Times: seconds on the output timeline.
"""
from common import *

FPS = 24
def q(t):
    return round(t * FPS) / FPS

# speech segments of every narration file (energy VAD, analyze_yp.py)
SPEECH = {
    'υπ1': [(0.14, 1.31), (1.65, 2.65), (2.88, 4.85), (5.49, 10.59), (11.04, 13.21)],
    'υπ2': [(0.21, 4.22), (4.59, 6.41)],
    'υπ3': [(0.17, 2.0), (2.71, 7.21), (7.83, 9.66), (10.02, 11.77), (12.03, 14.39)],
    'υπ4': [(0.16, 1.74), (2.31, 3.96), (4.15, 4.86), (5.07, 6.49)],
    'υπ5': [(0.14, 2.85), (3.42, 4.34), (4.63, 6.65), (7.33, 8.61), (8.93, 10.43), (10.8, 13.65)],
    'υπ6': [(0.15, 3.36), (4.05, 5.17), (5.42, 6.16), (6.42, 7.33)],
    'υπ7': [(0.26, 1.69), (2.17, 5.32), (5.65, 7.86), (8.56, 9.3), (9.58, 11.73), (11.96, 12.55), (12.8, 13.44)],
    'υπ8': [(0.15, 1.77), (2.19, 4.17), (4.64, 6.42), (6.6, 12.82)],
    'υπ9': [(0.27, 2.0), (2.41, 4.89), (5.18, 6.15), (6.89, 7.34), (7.56, 8.47), (8.66, 9.36)],
    'υπ10': [(0.14, 1.07), (1.32, 3.13), (3.84, 5.39), (5.66, 6.7), (7.1, 9.71), (9.91, 12.65)],
    'υπ11': [(0.18, 1.36), (1.56, 5.52), (6.11, 8.94), (9.63, 13.91), (14.41, 16.97)],
    'υπ12': [(0.13, 5.39), (5.88, 7.41), (7.72, 10.01), (10.3, 12.95)],
    'υπ13': [(0.13, 3.47), (3.77, 5.73), (6.08, 7.92), (8.23, 9.44)],
}
NFILE = {p: (p, 0, None) for p in SPEECH}

narr = {}
def put(piece, speech_start):
    place = speech_start - SPEECH[piece][0][0]          # timeline time of the FILE's second 0
    narr[piece] = dict(place=place, s_start=speech_start, s_end=place + SPEECH[piece][-1][1])
def S(p): return narr[p]['s_start']
def E(p): return narr[p]['s_end']
def at(p, file_t): return narr[p]['place'] + file_t

# ------------------------------------------------------------------ anchors
# the story's chapters are also the TikTok parts: 1-3 (Helena, empress in hard times), 4-6 (patience, the poor),
# 7-8 (the mother of the last emperor), 9-11 (the nun Hypomone, her repose), 12-13 (what her life teaches)
HEAD = 0.80
GAP, GAP_CHAPTER = 0.70, 0.95
CHAPTER_STARTS = (4, 7, 9, 12)
put('υπ1', HEAD)
for i in range(2, 14):
    put(f'υπ{i}', E(f'υπ{i - 1}') + (GAP_CHAPTER if i in CHAPTER_STARTS else GAP))
END = q(E('υπ13') + 3.60)
FINALE_T = E('υπ13') + 0.20                    # 13's music swells right after the last word
FADE_IN, FADE_OUT = 0.8, 2.6

ORDER = list('ABCDEFGHIJKLM')
CLIPKEY = dict(zip(ORDER, CLIPS))                # A: 01_yp1 ... M: 13_yp13
PIECE = dict(zip(ORDER, NARR))                   # A: υπ1 ... M: υπ13
SRCLEN = dict(zip(ORDER, [n / FPS for n in (361, 145, 361, 145, 361, 241, 361, 361, 241, 361, 385, 361, 241)]))
MUTED = set('EGHL')                              # English Grok dialogue under the narration

# ------------------------------------------------------------------ transitions (kind, centre, out, in)
T = {}
for prev, n in zip(ORDER[:-1], ORDER[1:]):
    c = q((E(PIECE[prev]) + S(PIECE[n])) / 2)
    half = (10 if int(PIECE[n][2:]) in CHAPTER_STARTS else 8) / FPS
    T[prev + n] = ('dissolve', c, half, half)

def span(key):
    kind, c, a, b = T[key]
    if kind == 'dissolve':
        return (q(c - a), q(c + b))
    return (c, c)

def scene_window(i):
    name = ORDER[i]
    t0 = 0.0 if i == 0 else span(ORDER[i - 1] + name)[0]
    t1 = END if i == len(ORDER) - 1 else span(name + ORDER[i + 1])[1]
    return q(t0), q(t1)

WIN = {n: scene_window(i) for i, n in enumerate(ORDER)}

def fit(name, align='start'):
    """The clip at 1.0x if it is long enough (from its start, or ending at its end), else all of it, slowed to fit."""
    t0, t1 = WIN[name]
    dur, L = t1 - t0, SRCLEN[name]
    if L >= dur:
        a = 0.0 if align == 'start' else L - dur
        return [(a, a + dur, t0, t1)]
    return [(0.0, L, t0, t1)]

# end-aligned where the clip's best image is its last: 06 ends on her praying hands, 10 on the old nun in the light,
# 12 on her face with the halo
ALIGN = {'F': 'end', 'J': 'end', 'L': 'end'}
SCENES = {n: fit(n, ALIGN.get(n, 'start')) for n in ORDER}

def speed(n):
    a, b, t0, t1 = SCENES[n][0]
    return (b - a) / (t1 - t0)

if __name__ == '__main__':
    print(f'END {END:.3f}  ({int(END // 60)}:{END % 60:05.2f}), {int(round(END * FPS))} frames')
    for k, v in narr.items():
        print(f'{k:5s} place {v["place"]:8.3f}  speech {v["s_start"]:8.3f} -> {v["s_end"]:8.3f}')
    for k, v in T.items():
        print('trans', k, v[0], f'{v[1]:.3f}', f'{v[2]:.3f}/{v[3]:.3f}')
    for n in ORDER:
        print(f'scene {n} {CLIPKEY[n]:8s} {PIECE[n]:5s} window {WIN[n][0]:8.3f}-{WIN[n][1]:8.3f} ({WIN[n][1] - WIN[n][0]:.2f}s)'
              + ('  muted' if n in MUTED else ''))
        for a, b, t0, t1 in SCENES[n]:
            print(f'      src {a:6.3f}-{b:6.3f} of {SRCLEN[n]:.3f}  tl {t0:8.3f}-{t1:8.3f}  speed {(b - a) / (t1 - t0):.3f}')
