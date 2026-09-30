"""Join the scene renders with the planned dissolves, then encode the deliverables from that master:
  * out/Agia Ypomoni - edit Claude.mp4          1080p24, the -16 LUFS mix; two-pass x264 sized to stay under GitHub's
                                                100 MB file limit (CRF 17 if that is already smaller)
  * out/Agia Ypomoni - edit Claude (kinito).mp4  720p, under 25 MB, for the phone
Usage: final_yp.py [--dry] [--no-master] [--two-pass] [--crf N]
  --crf N   also writes a heavier film at CRF N with no size cap ("... (CRF N).mp4"), for uploading from a PC;
            it is too big for GitHub (CRF 17 is about 245 MB for this film), so keep it out of git
"""
import sys
from plan_yp import *

R = os.path.join(W, 'render')
MASTER = os.path.join(R, 'final_master.mp4')          # video only, near-lossless; TikTok reads from it too
MIX = os.path.join(R, 'mix.wav')
FILM = os.path.join(OUT, f'{NAME} - edit Claude.mp4')
PHONE = os.path.join(OUT, f'{NAME} - edit Claude (kinito).mp4')
BT709 = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']


def join_graph():
    parts = []
    for i, n in enumerate(ORDER):
        w0, w1 = WIN[n]
        fx = []
        if n == ORDER[0]:
            fx.append(f'fade=t=in:st=0:d={FADE_IN}')
        if n == ORDER[-1]:
            fx.append(f'fade=t=out:st={END - FADE_OUT - w0:.6f}:d={FADE_OUT}')
        parts.append(f'[{i}:v]setpts=PTS-STARTPTS,fps=24,format=yuv420p,setsar=1' + (',' + ','.join(fx) if fx else '') + f'[{n}]')
    cur, step = ORDER[0], 0
    for prev, n in zip(ORDER[:-1], ORDER[1:]):
        kind, c, a, b = T[prev + n]
        step += 1
        lab = f'c{step}'
        if kind == 'dissolve':
            s0, s1 = span(prev + n)
            parts.append(f'[{cur}][{n}]xfade=transition=fade:duration={s1 - s0:.6f}:offset={s0:.6f}[{lab}]')
        else:
            parts.append(f'[{cur}][{n}]concat=n=2:v=1:a=0,settb=1/24,setpts=N,fps=24[{lab}]')
        cur = lab
    return ';'.join(parts), cur


def make_master():
    graph, last = join_graph()
    open(os.path.join(R, 'final_graph.txt'), 'w', encoding='utf-8').write(graph.replace(';', ';\n'))
    inputs = []
    for n in ORDER:
        inputs += ['-ignore_editlist', '1', '-i', os.path.join(R, f'scene_{n}.mp4')]
    run(inputs + ['-filter_complex', graph, '-map', f'[{last}]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '12',
                  '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48'] + BT709 + [MASTER])
    print('wrote', MASTER, flush=True)


def two_pass(src, out, vf, kbps, audio_kbps, preset='slow', extra=()):
    log = os.path.join(R, 'x264_' + os.path.basename(out).replace(' ', '_'))
    common = ['-i', src, '-i', MIX, '-map', '0:v', '-map', '1:a'] + (['-vf', vf] if vf else []) + [
        '-c:v', 'libx264', '-preset', preset, '-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.8)}k',
        '-bufsize', f'{kbps * 3}k', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48',
        '-passlogfile', log] + BT709 + list(extra)
    run(common + ['-pass', '1', '-an', '-f', 'mp4', os.devnull])
    run(common + ['-pass', '2', '-c:a', 'aac', '-b:a', f'{audio_kbps}k', '-ar', '48000', '-movflags', '+faststart', out])


def encode_film(limit_mb=95.0, target_mb=92.0, try_crf=True):
    os.makedirs(OUT, exist_ok=True)
    if not try_crf:                               # known to be too big at CRF 17 (this film: 245+ MB)
        kbps = int((target_mb * 8e6 / END - 256e3) / 1000)
        two_pass(MASTER, FILM, None, kbps, 256)
        print(f'film two-pass at {kbps} kb/s: {os.path.getsize(FILM) / 1e6:.1f} MB', flush=True)
        return
    run(['-i', MASTER, '-i', MIX, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
         '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48'] + BT709 +
        ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', FILM])
    mb = os.path.getsize(FILM) / 1e6
    print(f'film at CRF 17: {mb:.1f} MB', flush=True)
    if mb > limit_mb:
        kbps = int((target_mb * 8e6 / END - 256e3) / 1000)
        two_pass(MASTER, FILM, None, kbps, 256)
        print(f'film two-pass at {kbps} kb/s: {os.path.getsize(FILM) / 1e6:.1f} MB', flush=True)


def encode_phone(target_mb=23.0):
    kbps = min(2500, int((target_mb * 8e6 / END - 128e3) / 1000))
    two_pass(MASTER, PHONE, 'scale=1280:720:flags=lanczos', kbps, 128)
    print(f'phone copy: {os.path.getsize(PHONE) / 1e6:.1f} MB ({kbps} kb/s)', flush=True)


def encode_crf(crf):
    out = FILM.replace('.mp4', f' (CRF {crf}).mp4')
    run(['-i', MASTER, '-i', MIX, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
         '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48'] + BT709 +
        ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', out])
    print(f'film at CRF {crf}: {os.path.getsize(out) / 1e6:.1f} MB -> {out}', flush=True)


if __name__ == '__main__':
    if '--crf' in sys.argv:
        encode_crf(int(sys.argv[sys.argv.index('--crf') + 1])); sys.exit()
    if '--dry' in sys.argv:
        print(join_graph()[0].replace(';', ';\n')); sys.exit()
    if '--no-master' not in sys.argv:
        make_master()
    encode_film(try_crf='--two-pass' not in sys.argv)
    encode_phone()
