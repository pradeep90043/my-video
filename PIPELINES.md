# CodeOrCap Video Pipelines

This repo produces two kinds of videos, each with its own pipeline:

| | **Shorts** | **Long-form** |
|---|---|---|
| Platforms | YouTube Shorts, Instagram Reels | YouTube |
| Resolution | 1080×1920 (portrait) | 1920×1080 (landscape) |
| Length | 30–60 s | 4–10 min |
| Content lives in | `generated/` + `public/content/factory/<slug>/`, `public/content/codeorcap/` | `public/content/<slug>/` |
| Entry commands | `npm run shorts`, `npm run shorts:codeorcap` | `npm run longform -- --project <slug>` |

---

## 1. Shorts pipeline (1080×1920)

### 1a. Factory shorts — fully automatic (topic → final mp4)

```bash
npm run shorts                          # auto topic
npm run shorts -- --topic "React Is Dead" --category React
npm run shorts:script                   # script only (skip images/voice/render)
npm run shorts:storyboard               # script + images
npm run shorts:render                   # re-render with existing assets
```

13 steps orchestrated by `scripts/pipeline.ts` (used by CLI `scripts/generate-video.ts`
and HTTP server `scripts/server.ts`):

1. **TopicAgent** → topic (Gemini/Claude, `LLM_PROVIDER` in `.env`)
2. **ScriptAgent** → 30–60 s Hinglish script
3. **ScenePlanner** → scene breakdown
4. **ImagePromptAgent** → image prompts
5. **ImageGenerator** → Gemini images
6. **VoiceAgent** → TTS (`VOICE_PROVIDER`: elevenlabs / google-tts / edge-tts / mac-tts)
7. **SubtitleAgent** → word timings
8. **ThumbnailAgent**, **MetadataAgent** → thumbnail + YouTube metadata
9. **RenderAgent** → renders `FactoryVideo` composition silently, ffmpeg-merges
   voiceover, **appends the brand outro** (`OUTRO_PATH` in `.env`), copies to `out/`.

### 1b. CodeOrCap reels — claim fact-check format

```bash
npm run shorts:gen -- codeorcap --topic "MERN Stack Is Outdated"   # generate content + TTS
npm run shorts:codeorcap                                           # render + ffmpeg merge
```

Input: `public/content/codeorcap/input.json` → `CodeOrCap` composition
(`src/codeorcap/CodeOrCapVideo.tsx`) → `out/codeorcap-<slug>.mp4`.

---

## 2. Long-form pipeline (1920×1080) — the AIvsSWE way

Long-form videos are **project-based**. Each project is a folder:

```
public/content/<slug>/
  video.json            # script + TTS settings + timings (source of truth)
  audio/segment_*.mp3   # per-scene TTS (generated)
  audio/voiceover.mp3   # merged voiceover (generated)
  video/*.mp4           # optional stock background clips
```

### Commands

```bash
npm run longform:new -- --project MyTopic       # scaffold a new project
npm run longform:check -- --project AivsSWE     # preflight only (tools, video.json, composition, disk)
npm run longform -- --project AivsSWE           # full run: preflight → TTS → merge → render → QA
npm run longform -- --project AivsSWE --skip-audio   # just re-render
npm run longform -- --project AivsSWE --images       # also generate scene images (free Pollinations)
npm run longform -- --project AivsSWE --from merge   # resume a failed run from a step (audio|images|merge|render)

# or step-by-step:
npm run longform:audio  -- --project AivsSWE    # edge-tts per scene (cached, retried) + exact frame timings
npm run longform:merge  -- --project AivsSWE    # frame-exact pad + concat + -16 LUFS → voiceover.mp3
npm run longform:render -- --project AivsSWE    # 720p by default (--resolution 1080 for full HD); remotion render → logo/BT.709 encode → QA → out/AivsSWE.mp4
npm run longform:qa     -- --project AivsSWE    # re-run QA on an existing render
```

Flags: `--force` (regenerate all TTS), `--no-branding` (skip logo, still converts colour),
`--concurrency N`, `--out path.mp4`. Each run writes a step-timing summary to `out/logs/`.

### Production guarantees

- **Preflight** fails fast on missing ffmpeg/edge-tts, invalid `video.json`, an unregistered
  composition, or too little disk — before any slow step.
- **TTS** is cached per scene (hash of text+voice+rate+pitch), retried 3×, and written atomically.
- **Audio/visual sync** is frame-exact: each segment is padded to its scene's `durationFrames`.
- **Render** is written to a temp file and only moved into place after the QA gate passes
  (a failed QA is kept as `*.FAILED-QA.mp4`). Output is H.264 CRF 16, BT.709 limited-range yuv420p.
- **QA gate** checks resolution, fps, codec, pixel format, audio present/not silent, duration vs
  timeline; warns on loudness and black frames.

### How it works (scripts in `scripts/longs/`)

1. **Write the script** — fill each scene's `text` in `video.json`. Scene order =
   video order. TTS settings (`voice`, `rate`, `pitch`) live in the same file.
2. **`generate-audio.ts`** — one edge-tts mp3 per scene; ffprobe measures each and
   writes exact `startFrame`/`durationFrames`/`totalFrames` back into `video.json`,
   so visuals stay perfectly synced to the voiceover.
3. **`merge-audio.ts`** — concatenates segments into `audio/voiceover.mp3`.
4. **Build scenes** — one React component per scene (see `src/codeorcap/scenes/`
   for the AIvsSWE set: HookScene, ClaimScene, GroundRulesScene, SWEDataScene,
   AIDataScene, HeadToHeadScene, RealityCheckScene, VerdictScene5Min, CTAScene).
5. **Register the composition** in `src/Root.tsx` with id = project slug,
   1920×1080, `durationInFrames = totalFrames + intro/outro frames.
   The composition plays intro.mp4 → scenes (each in a `<Sequence>` at its
   `startFrame`) → outro.mp4, with the merged voiceover + ambient music.
6. **`render.ts`** — `npx remotion render <slug>` → `out/<slug>.mp4`
   (audio renders inside the composition; the branded outro is part of it).

### Stickman template (no scene code needed)

A project with `"template": "stickman"` renders through the shared `StickmanVideo` composition
(`src/stickman/`). Scaffold and run:

```bash
npm run longform:new -- --project MyTopic --template stickman --theme light   # or dark
# write each scene's "text" and tune its "visual" block in public/content/MyTopic/video.json
npm run longform -- --project MyTopic         # TTS → merge → render (720p) → QA
```

Each scene's `visual` (validated in preflight; schema in `src/stickman/schema.ts`):

| field | values |
|---|---|
| `pose` | idle, point, present, shrug, think, celebrate, worried, facepalm, shocked, walk |
| `mood` | neutral, happy, worried, shocked, sad |
| `props[]` | `type` laptop, bulb, chartUp, chartDown, warning, clock, money, robot, question, check, cross, rocket, lock, gear, magnifier, bug, code; plus `x`, optional `y`, `scale`, `accent`, `delay` (frames) |
| `title`, `callouts[]` | big headline and up to 4 pills |
| `camera` | none, push, pull, pan-left, pan-right |
| `transition` | cut, wipe |
| `accent` | red, blue, gold, green |
| `figureX`, `flip`, `hideFigure` | figure placement |

Tips: keep each scene to ~2 short sentences (≤ 6 s) so something changes every few seconds (preflight
warns above 8 s); grounded props (laptop, robot, …) stand on the floor automatically; the figure's
mouth animates while the scene plays and its pose eases from the previous scene's. Captions are
generated from the scene text. Reference: `public/content/stickman-demo/`.

### Reference project: AIvsSWE

- Content: `public/content/AivsSWE/` (script, audio, background clips)
- Composition: `AIvsSWE` in `src/Root.tsx` → `src/codeorcap/AIvsSWEVideo.tsx`
- Scenes: `src/codeorcap/scenes/`
- Structure: hook → claim → rules → swe → ai → headToHead → reality → verdict → cta

---

## Shared assets

- `public/audio/` — shared SFX only (`background-music.mp3`, `text-pop.mp3`,
  `text-whoosh.mp3`)
- `src/codeorcap/intro.mp4`, `outro.mp4`, `logo.png` — brand intro/outro/logo
- Brand tokens: `scripts/config.ts` (`BRAND`, `VIDEO`, `MODELS`)

## Requirements

- `edge-tts` (Python: `pip install edge-tts`), `ffmpeg`/`ffprobe` on PATH
- `.env`: `GEMINI_API_KEY` (+ optional `ELEVENLABS_API_KEY`, `LLM_PROVIDER`,
  `VOICE_PROVIDER`, `OUTRO_PATH`)
