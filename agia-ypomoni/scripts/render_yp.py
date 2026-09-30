"""Render every scene of plan_yp to a 1920x1080 / 24 fps intermediate with exact frame counts.
Slow segments use motion-compensated interpolation (at the clip's own 1264x720, before the scale); colours untouched."""
import sys
from concurrent.futures import ThreadPoolExecutor
from plan_yp import *

R = os.path.join(W, 'render')
os.makedirs(R, exist_ok=True)
SCALE = 'scale=1920:1094:flags=lanczos,crop=1920:1080:0:7,setsar=1,format=yuv420p'
MINTERP = 'minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=8'

def speed_chain(sp):
    if abs(sp - 1) < 1e-3:
        return 'fps=24'
    if abs(sp - 1) < 0.02 or sp > 1:
        return f'setpts=PTS/{sp:.6f},fps=24'
    return f'setpts=PTS/{sp:.6f},{MINTERP}'

def count_frames(path):
    """Video packets, read with the edit list ignored (ffmpeg 6 prints no frame= line for a stream copy)."""
    p = subprocess.run([FF.replace('ffmpeg', 'ffprobe'), '-v', 'error', '-ignore_editlist', '1', '-select_streams', 'v:0',
                        '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', path],
                       capture_output=True, text=True)
    return int(p.stdout.strip() or -1)

def render_scene(name):
    out = os.path.join(R, f'scene_{name}.mp4')
    w0, w1 = WIN[name]
    total = int(round(w1 * FPS)) - int(round(w0 * FPS))
    src = os.path.join(DL, CLIPS[CLIPKEY[name]])
    segs = SCENES[name]
    parts = [f'[0:v]split={len(segs)}' + ''.join(f'[s{i}]' for i in range(len(segs)))]
    labels, used = [], 0
    for i, (a, b, t0, t1) in enumerate(segs):
        n = int(round(t1 * FPS)) - int(round(t0 * FPS))       # cumulative rounding: segments always sum up
        used += n
        sp = (b - a) / (t1 - t0)
        parts.append(f'[s{i}]trim=start={max(a, 0):.6f}:end={b + 3 / FPS:.6f},setpts=PTS-STARTPTS,{speed_chain(sp)},'
                     f'tpad=stop_mode=clone:stop=12,trim=end_frame={n},settb=1/24,setpts=N[v{i}]')
        labels.append(f'[v{i}]')
    assert used == total, (name, used, total)
    chain = ''.join(labels) + (f'concat=n={len(segs)}:v=1:a=0,' if len(segs) > 1 else '')
    parts.append(chain + f'settb=1/24,setpts=N,{SCALE}[out]')
    run(['-i', src, '-filter_complex', ';'.join(parts), '-map', '[out]', '-an', '-fps_mode', 'passthrough',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '11', '-pix_fmt', 'yuv420p', '-threads', '2',
         '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out])
    got = count_frames(out)
    return f'scene {name}: want {total} frames -> {got}' + ('' if got == total else '   !! MISMATCH')

if __name__ == '__main__':
    names = sys.argv[1:] or ORDER
    with ThreadPoolExecutor(2) as ex:
        for line in ex.map(render_scene, names):
            print(line, flush=True)
