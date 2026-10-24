# 3D / realistic-motion branch (`feat/3d-characters`)

Goal: characters that can **turn 360°**, move with real weight (walk, run, sleep, struggle), react (head shake / nod), and a camera that moves
through the scene, instead of today's flat 2D side-view drawings. Everything must stay free to run (GitHub runners, Kaggle GPU).

## What exists today (main)
- 2D vector characters (people + 4-legged animals) in `src/stickman/story/*`, planned by `shorts-automation/src/my-video/storyPlanner.ts`.
- Chunked cloud render (`render.yml`, ~450 frames per runner), cloned voice, word timings.

## Measured here (this branch)
`Story3DDemo` (`src/three3d/`): a procedural rigged wolf built from primitives (hips/spine/neck/head/tail/4 legs with knees), trot gait,
low-poly forest with shadows, camera orbiting a full 360° — rendered with `@remotion/three` on **software GL (`--gl=swangle`, no GPU)**:

| | |
|---|---|
| resolution | 720x1280 (vertical Short) |
| marginal cost | **~0.13 s / frame** on an Apple M1 (8 cores); startup ~6 s |
| estimate on a GitHub 2-core runner | ~0.6-0.8 s / frame (4-6x slower) |
| 5-minute video (9000 frames) | single runner ~1.5-2 h, but the existing chunked render fans it over ~20 runners: **~10-20 min** |

So 3D on CPU-only runners is feasible with the chunked render already in place. Real GLB characters and more props cost more per frame
(budget: keep draw calls low, shadows off or baked, 1 key light + ambient, toon/flat materials).

## References you sent, and what we take from each
| Repo | License | Use for us |
|---|---|---|
| OpenMontage | AGPL-3.0 | ideas only (no code copied): character-animation pipeline (rigs, pose libraries, action timelines), Three.js world + Blender "production tier" with licensed GLB catalogs, AI clips for hero shots |
| Pixelle-Video | Apache-2.0 | script -> per-sentence AI image/video (ComfyUI / RunningHub / direct APIs: Wan, Kling, Seedance), image-to-video, motion transfer; good template for the optional "AI clip for key shot" lane |
| Wan2.2 | Apache-2.0 | open image-to-video (TI2V-5B) / Wan2.2-Animate (character animation + replacement) / S2V (audio-driven): runs on a GPU (Kaggle) for a few key shots |
| LivePortrait | MIT code (check face-model licence) | animate a face (also animals) from a driving clip: lively faces for key close-ups; NVIDIA GPU for animals mode |
| Duix-Avatar | custom, check | offline lip-synced talking avatar from a real person video: not needed for cartoon stories |
| Hypit | Apache-2.0 with conditions (own use OK, no hosting for others) | agent workflow language anchoring visuals to words not seconds: we already anchor to word timings |
| video-shotcraft | Apache-2.0 | 150 Remotion shot recipes (camera moves, transitions): borrow camera/transition recipes for the 3D scenes |
| Toonflow, waoowaoo, OpenCreator | MIT / unclear / Apache-2.0 | storyboard + agent canvas products: reference for planning UX, not for rendering |
| brago | not found (404) | link did not resolve; send the correct URL if it matters |

## Recommended architecture (hybrid, cheapest first)
1. **Lane A, 3D characters in Remotion (default).** Rigged characters as GLB (CC0 / own-made in Blender: wolf, buffalo, goat, fox, monkey,
   man, woman, child, elder) played with their own animation clips (idle, walk, run, sleep, struggle, talk, head-shake, nod), lip sync by
   jaw/blend-shape driven by the word timings, camera rig (orbit, push-in, over-the-shoulder), the same `story` plan schema (bg, props, fx, cast,
   poses, says, react) mapped to 3D assets. CPU render, chunked.
2. **Lane B, AI clip for a hero moment (optional).** Wan2.2 TI2V/I2V on Kaggle GPU for 3-5 s shots (e.g. the wolf stuck inside the bull),
   seeded from a 3D/2D still of our own characters so identity matches; stitched into the timeline. Limits: a few seconds per clip,
   identity drift, no word-accurate lips, slow on free GPU.
3. **Lane C, face close-ups.** LivePortrait for expressive face moments when a person (not an animal) speaks on camera.

## Phases
1. (done) Prototype + cost measurement.
2. 3D character kit: 3 rigged assets (wolf, a person, a buffalo) + animation clips + a `Character3D` component with the same props as the 2D `Character`.
3. `story3d` scene type in the schema + `storyPlanner` mapping (poses/props/fx -> 3D), side by side with the 2D path (`CHANNEL_STYLES` switch).
4. Camera director (per-beat camera moves), baked lighting, performance pass on the runner.
5. Optional Lane B (Wan2.2 on Kaggle) for hero shots.

## Risks
- Asset sourcing/licensing for rigged GLB characters (must be CC0 or ours).
- Runner CPU cost grows with scene complexity; the chunked render hides it but costs minutes.
- Lip sync on 3D faces needs a viseme/blend-shape rig.
