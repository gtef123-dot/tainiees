"""Paths and helpers for the «Αγία Υπομονή» film (clips yp1..yp13 from Grok, narration υπ1..υπ13 from ElevenLabs).

Linux port of the Windows pipeline (Documents\\ClaudeVideoPipeline): the same structure and names, with ffmpeg from PATH
and the media inside the repo instead of Downloads.
"""
import os, shutil, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
FF = shutil.which('ffmpeg') or 'ffmpeg'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))      # agia-ypomoni/
DL = os.path.join(ROOT, 'media')                                        # the user's files, untouched
W = os.path.join(ROOT, 'work')                                          # analysis and intermediates (not in git)
OUT = os.path.join(ROOT, 'out')                                         # deliverables
CLIPS = {f'{i:02d}_yp{i}': os.path.join('clips', f'yp{i}.mp4') for i in range(1, 14)}
NARR = {f'υπ{i}': os.path.join('narration', f'υπ{i}.mp3') for i in range(1, 14)}
TITLE = 'ΑΓΙΑ ΥΠΟΜΟΝΗ'
NAME = 'Agia Ypomoni'


def run(args, **kw):
    return subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y'] + args, check=True, **kw)
