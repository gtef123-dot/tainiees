"""TikTok version of the «Αγία Υπομονή» film: five vertical parts cut at the story's chapter breaks.

Layout 1080x1920 (as tiktok_plan_pa): a blurred, darkened copy of the shot fills the screen; the shot itself sits in
the middle as a 1:1 window; series + chapter title in the top band, a 'next part' card at the end. Parts land in
TikTok's 21-45 s storytelling range and never cut a phrase. Where a part boundary falls inside a dissolve, each side
reads its own scene file, so neither part shows the other; part 1 opens on the shot at full light (no fade from black).
"""
from plan_yp import *

SERIES = TITLE
FG_Y = 400                       # top of the 1080x1080 window on the 1920 canvas
cCD, cFG, cHI, cKL = T['CD'][1], T['FG'][1], T['HI'][1], T['KL'][1]
def nxt(p): return narr[p]['s_start']

# v0/v1: film time span; tail: frozen last frame; a_end: audio fully faded by then (never the next part's words);
# over: (scene, t0, t1) read from the scene's own file instead of the film (heads/tails inside transitions)
PARTS = [
    dict(v0=0.0, v1=cCD, tail=0.30, ain=0.0, a_end=nxt('υπ4') - 0.05, aout=0.60, vfade=0.60,
         title='Αυτοκράτειρα σε δύσκολους καιρούς', over=[('A', 0.0, FADE_IN), ('C', span('CD')[0], cCD)]),
    dict(v0=cCD, v1=cFG, tail=0.40, ain=0.30, a_end=nxt('υπ7') - 0.05, aout=0.50, vfade=0.0,
         title='Ταπεινή και φιλάνθρωπη', over=[('D', cCD, span('CD')[1]), ('F', span('FG')[0], cFG)]),
    dict(v0=cFG, v1=cHI, tail=0.40, ain=0.20, a_end=nxt('υπ9') - 0.05, aout=0.50, vfade=0.0,
         title='Η μητέρα του τελευταίου αυτοκράτορα', over=[('G', cFG, span('FG')[1]), ('H', span('HI')[0], cHI)]),
    dict(v0=cHI, v1=cKL, tail=0.30, ain=0.30, a_end=nxt('υπ12') - 0.05, aout=0.60, vfade=0.0,
         title='Από αυτοκράτειρα, μοναχή Υπομονή', over=[('I', cHI, span('HI')[1]), ('K', span('KL')[0], cKL)]),
    dict(v0=cKL, v1=END, tail=0.0, ain=0.20, a_end=END, aout=0.0, vfade=0.0,
         title='Η υπομονή είναι δύναμη ψυχής', over=[('L', cKL, span('KL')[1])]),
]
NP = len(PARTS)

def tl(scene, src):
    """Timeline time of a source time of the scene's clip."""
    a, b, t0, t1 = SCENES[scene][0]
    return t0 + (src - a) * (t1 - t0) / (b - a)

# a strong frame of each part for its cover (scene, source second)
COVER_T = [tl('B', 3.0), tl('E', 12.5), tl('G', 7.0), tl('J', 13.2), tl('L', 14.2)]

# horizontal centre (1080p x) of the 1:1 window, per scene, keyed on the clip's own seconds; smooth between keys
SCENE_KEYS = {
    'A': [(0.0, 640), (8.5, 700), (13.0, 860)],
    'B': [(0.0, 800)],
    'C': [(0.0, 600)],
    'D': [(0.0, 700), (3.5, 820), (6.0, 1000)],
    'E': [(0.0, 700), (5.5, 780), (7.0, 900)],
    'F': [(0.0, 700), (10.0, 780)],
    'G': [(0.0, 900)],
    'H': [(0.0, 900), (3.0, 1150), (5.0, 1300), (12.5, 1300), (13.6, 1100)],
    'I': [(0.0, 940)],
    'J': [(0.0, 700), (5.0, 760), (7.0, 940)],
    'K': [(0.0, 860), (6.0, 820)],
    'L': [(0.0, 880), (8.0, 930)],
    'M': [(0.0, 760), (6.0, 860)],
}

def _scene_at(t):
    owner = ORDER[0]
    for n in ORDER:
        if WIN[n][0] <= t < WIN[n][1]:
            owner = n
    return owner if t < END else ORDER[-1]

def _cx_scene(n, t):
    a, b, t0, t1 = SCENES[n][0]
    s = a + (t - t0) * (b - a) / (t1 - t0)
    ks = SCENE_KEYS[n]
    if s <= ks[0][0]: return ks[0][1]
    for (s0, x0), (s1, x1) in zip(ks[:-1], ks[1:]):
        if s0 <= s <= s1:
            u = (s - s0) / (s1 - s0); u = u * u * (3 - 2 * u)
            return x0 + (x1 - x0) * u
    return ks[-1][1]

def cx(t):
    """Inside a dissolve the window glides from the outgoing scene's centre to the incoming one's."""
    for key in T:
        s0, s1 = span(key)
        if s0 <= t <= s1:
            u = (t - s0) / (s1 - s0); u = u * u * (3 - 2 * u)
            return _cx_scene(key[0], t) * (1 - u) + _cx_scene(key[1], t) * u
    return _cx_scene(_scene_at(t), t)

def x0_of(t):
    return int(min(max(round(cx(t) - 540), 0), 840)) // 2 * 2

if __name__ == '__main__':
    for k, P in enumerate(PARTS, 1):
        dur = P['v1'] - P['v0'] + P['tail']
        print(f"part {k}: {P['v0']:7.3f} -> {P['v1']:7.3f} (+{P['tail']:.2f} tail) = {dur:5.2f} s   audio faded by {P['a_end']:.3f}"
              f"   cover at {COVER_T[k - 1]:.2f}   '{P['title']}'")
