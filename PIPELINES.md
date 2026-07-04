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
npm run longform -- --project AivsSWE           # full run: TTS → merge → render
npm run longform -- --project AivsSWE --skip-audio   # just re-render

# or step-by-step:
npm run longform:audio  -- --project AivsSWE    # edge-tts per scene + exact frame timings
npm run longform:merge  -- --project AivsSWE    # ffmpeg concat → voiceover.mp3
npm run longform:render -- --project AivsSWE    # remotion render → out/AivsSWE.mp4
```

(With a single project in `public/content/`, `--project` can be omitted.)

### How it works (scripts in `scripts/longform/`)

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
