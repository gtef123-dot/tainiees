"""Checks on the finished «Αγία Υπομονή» film: frame count, picture sync of every scene against its clip, every
narration where the plan put it, loudness and peak, and no voice anywhere under the narration.
Usage: check_yp.py [film.mp4]   (default: the YouTube film in out/)
"""
import sys
import numpy as np
from scipy.signal import correlate
from plan_yp import *
from audio_lib import load, lufs, seg, narr_audio, SR

F_ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, f'{NAME} - edit Claude.mp4')
ok = True

p = subprocess.run([FF, '-v', 'error', '-i', F_, '-vf', 'scale=64:36,format=gray', '-fps_mode', 'passthrough',
                    '-f', 'rawvideo', '-'], capture_output=True, check=True)
fr = np.frombuffer(p.stdout, np.uint8).reshape(-1, 64 * 36).astype(np.float32)
want = int(round(END * FPS))
print('frames', len(fr), 'expected', want); ok &= len(fr) == want

def src_frames(key, s, n=3):
    q_ = subprocess.run([FF, '-v', 'error', '-ss', f'{max(0.0, s - 1.5 / FPS):.4f}', '-i', os.path.join(DL, CLIPS[key]),
                         '-frames:v', str(n), '-fps_mode', 'passthrough',
                         '-vf', 'scale=1920:1094,crop=1920:1080:0:7,scale=64:36,format=gray',
                         '-f', 'rawvideo', '-'], capture_output=True)
    return np.frombuffer(q_.stdout, np.uint8).reshape(-1, 64 * 36).astype(np.float32)

print('picture sync (film frame at mid-scene vs the source frame the plan maps it to; error must be smallest at 0):')
for n in ORDER:
    a, b, t0, t1 = SCENES[n][0]
    sp = (b - a) / (t1 - t0)
    k = int(round(((t0 + t1) / 2) * FPS))
    s = a + (k / FPS - t0) * sp
    ref = src_frames(CLIPKEY[n], s)
    if len(ref) < 3:
        print(f'  {n}: could not read the source'); ok = False; continue
    errs = [float(np.abs(fr[k] - ref[j]).mean()) for j in range(3)]      # source frames s-1, s, s+1
    best = int(np.argmin(errs)) - 1
    if abs(sp - 1) < 1e-3:
        good = errs[1] < 6 and best == 0
    else:                                                                 # slowed: the frame sits between source frames
        good = min(errs) < 6
    print(f'  {n} {CLIPKEY[n]:8s} frame {k} vs src {s:6.3f}s (x{sp:.3f}): err(-1,0,+1) {[round(e, 2) for e in errs]}'
          + ('' if good else '   !!'))
    ok &= good

mix = load(F_)
L, pk = lufs(mix), 20 * np.log10(np.abs(mix).max())
print(f'audio {len(mix) / SR:.3f} s (picture {END:.3f} s), {L:.2f} LUFS, peak {pk:.2f} dBFS')
ok &= abs(len(mix) / SR - END) < 0.05 and abs(L + 16) < 0.5 and pk < -1.0

print('narration placement (cross-correlation of each file with the film):')
m = mix.mean(axis=1)
for pce in NFILE:
    ref = narr_audio(pce).mean(axis=1)
    place = narr[pce]['place']
    w = seg(m[:, None], place - 0.3, place + len(ref) / SR + 0.3)[:, 0]
    c = correlate(w, ref[:len(w) - int(0.6 * SR)], mode='valid', method='fft')
    lag = np.argmax(np.abs(c)) / SR - 0.3
    good = abs(lag) < 0.005
    print(f'  {pce:5s} planned {place:8.3f} s, offset {lag * 1000:+6.1f} ms' + ('' if good else '   !!'))
    ok &= good

stem = os.path.join(W, 'render', 'stem_rest.npy')
if os.path.exists(stem):
    from faster_whisper.vad import get_speech_timestamps, VadOptions
    from scipy.signal import resample_poly
    x = np.load(stem).mean(axis=1).astype(np.float32)
    x16 = resample_poly(x, 1, 3).astype(np.float32)
    x16 /= max(1e-6, np.abs(x16).max())
    ts = get_speech_timestamps(x16, VadOptions(threshold=0.5, min_speech_duration_ms=150))
    found = [(round(t['start'] / 16000, 2), round(t['end'] / 16000, 2)) for t in ts]
    print('voice under the narration (music bus, normalised, silero VAD):', found or 'none')
    ok &= not found

print('ALL OK' if ok else 'MISMATCH')
