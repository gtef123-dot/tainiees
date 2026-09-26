# The Apostle Peter — a cinematic animated short

A 2:51 painted film about the life of Saint Peter, drawn and scored entirely in code with [anidoodle](https://github.com/alexgreensh/anidoodle), over 13 Greek narration clips from ElevenLabs. 1920×1080, 30 fps.

## Layout

```
apostle-peter/
  audio/narration/      peter_01.mp3 … peter_13.mp3: the ElevenLabs clips, used untouched
  story/
    narration.json        the locked Greek text, one entry per clip (reference only, never edited)
    timeline.config.json  the only authored timing: head, tail, breathing room after each clip
    timeline.gen.json     GENERATED: measured durations, frame ranges, pauses, per-word timing
    shots.mjs             the shot list as data: every shot anchored to a word of the narration
    shots.gen.json        GENERATED: every shot resolved to frames (the film's cue table)
  pipeline/
    timing.mjs            measures the clips and lays them on the frame grid
    shotlist.mjs          resolves the shots and writes docs/shotlist.md
  docs/                   audio_timing.md, shotlist.md, style_guide.md (later: character_bible.md, review_log.md)
  out/                    renders (from Milestone 2 on)
```

## Rebuild the timing and shot list

Needs Node 20+ and ffmpeg (the repo's SessionStart hook installs both in cloud sessions).

```bash
node pipeline/timing.mjs      # -> story/timeline.gen.json, docs/audio_timing.md
node pipeline/shotlist.mjs    # -> story/shots.gen.json, docs/shotlist.md
```

## Replacing an ElevenLabs clip

1. Export the new take from ElevenLabs and save it over the old file with the **same name**, e.g. `audio/narration/peter_07.mp3`. Do not trim, speed up or edit it.
2. Run the two commands above.

That's all. `timing.mjs` re-measures every clip to the sample, re-detects the pauses and re-aligns the words. It moves the clip and every clip after it on the frame grid. `shotlist.mjs` re-resolves every shot from its word anchor, so the cuts follow the new voice. It also fails loudly if a shot has collapsed to zero frames, or if an anchor word no longer exists (for example, if the text itself changed; it is locked, so that should never happen). Both generated files record each clip's sha256, so a render can always say exactly which audio it was built from.

To change a silence between clips, edit only `gapAfter` in `story/timeline.config.json` (frames, with the reason) and re-run.

## Milestones

| # | Milestone | Status |
|---|---|---|
| 1 | Script timing: `docs/audio_timing.md`, `docs/shotlist.md` | **done**, waiting for shot-list approval |
| 2 | Character bible and `out/peter_character_sheet.png` | next |
| 3 | Environment tests and `out/environment_contact_sheet.png` | |
| 4 | Storyboard and `out/storyboard_full.png` | |
| 5 | Animatic at 960×540 with the real narration: `out/peter_animatic.mp4` | |
| 6 | Animation, shot by shot | |
| 7 | Polish, review log, contact sheet, `out/apostle_peter_final_1080p.mp4`, `out/poster_frame.png` | |
