/**
 * Pure-logic tests for the stickman pipeline.  Run: npm test
 * (node:test via tsx — no extra dependencies)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildDuckEnvelope, buildTimeline, figureFraction, type SceneInput } from "../src/stickman/fx/timeline";
import { buildPages } from "../src/stickman/fx/pages";
import { StickerSchema, StickmanVisualSchema, validateStickmanScenes } from "../src/stickman/schema";

const FPS = 30;

/** n consecutive scenes of `dur` frames, with 1s of speech and word timings. */
function scenes(n: number, dur = 150, visual: (i: number) => unknown = () => ({})): SceneInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    text: "alpha beta gamma delta",
    startFrame: i * dur,
    durationFrames: dur,
    duration: 4,
    pauseBefore: 0.2,
    visual: visual(i),
    words: [
      { w: "alpha", s: 0.1, d: 0.4 },
      { w: "beta", s: 0.6, d: 0.4 },
      { w: "gamma", s: 2.0, d: 0.5 }, // 1s pause before this word
      { w: "delta", s: 2.6, d: 0.5 },
    ],
  }));
}

test("transitions never shift a scene's start (narration stays in sync)", () => {
  const tl = buildTimeline(scenes(6, 150, (i) => ({ mood: i % 2 ? "happy" : "shocked" })), FPS);
  let cursor = 0;
  tl.scenes.forEach((s, i) => {
    assert.equal(s.from, i * 150);
    // TransitionSeries places scene i at sum(seqDuration) - sum(overlaps)
    assert.equal(cursor, s.from, `scene ${i} would start at ${cursor}, expected ${s.from}`);
    cursor += s.seqDuration - (s.out?.frames ?? 0);
  });
  assert.ok(tl.scenes.some((s) => s.out), "expected at least one transition");
});

test("transition=cut produces no overlap; explicit type is honoured", () => {
  const tl = buildTimeline(scenes(3, 150, (i) => (i === 1 ? { transition: "cut" } : i === 2 ? { transition: "iris" } : {})), FPS);
  assert.equal(tl.scenes[0].out, undefined); // next scene is "cut"
  assert.equal(tl.scenes[1].out?.type, "iris");
  assert.equal(tl.scenes[2].out, undefined); // last scene
});

test("transitions: false disables every overlap", () => {
  const tl = buildTimeline(scenes(4), FPS, { transitions: false });
  assert.ok(tl.scenes.every((s) => !s.out && s.seqDuration === s.duration));
  assert.equal(tl.blurWindows.length, 0);
});

test("very short scenes fall back to a cut instead of a broken overlap", () => {
  const tl = buildTimeline(scenes(3, 6), FPS);
  assert.ok(tl.scenes.every((s) => !s.out));
});

test("mouth only moves while words sound (not in pauses or the tail)", () => {
  const [s] = buildTimeline(scenes(1), FPS).scenes;
  const open = (f: number) => s.talkRanges!.some(([a, b]) => f >= a && f < b);
  const speakFrom = Math.round(0.2 * FPS);
  assert.ok(open(speakFrom + Math.round(0.3 * FPS)), "open during 'alpha'");
  assert.ok(!open(speakFrom + Math.round(1.5 * FPS)), "closed in the 1s pause");
  assert.ok(!open(s.duration - 2), "closed in the silent tail");
  assert.equal(s.talkRanges!.length, 2, "two spoken phrases");
});

test("scenes without word timings keep the whole-window fallback", () => {
  const input = scenes(1);
  delete input[0].words;
  const [s] = buildTimeline(input, FPS).scenes;
  assert.equal(s.talkRanges, undefined);
});

test("captions fall back to estimated word timings inside the speech window", () => {
  const input = scenes(1);
  delete input[0].words;
  const tl = buildTimeline(input, FPS);
  const w = tl.words[0];
  assert.equal(w.length, 4);
  const start = Math.round(0.2 * FPS);
  assert.ok(w[0].startFrame >= start && w[w.length - 1].endFrame <= start + 4 * FPS + 1);
  for (let i = 1; i < w.length; i++) assert.ok(w[i].startFrame >= w[i - 1].startFrame);
});

test("caption pages never span two scenes and respect maxWords", () => {
  const tl = buildTimeline(scenes(3), FPS);
  const pages = buildPages(tl.words, FPS, 3);
  assert.ok(pages.length >= 3);
  for (const p of pages) assert.ok(p.tokens.length <= 3 && p.tokens.length >= 1);
  const sceneOf = (frame: number) => Math.floor(frame / 150);
  for (const p of pages) {
    const first = sceneOf(p.tokens[0].from);
    const last = sceneOf(p.tokens[p.tokens.length - 1].from);
    assert.equal(first, last, "page crosses a scene boundary");
  }
  // pages are ordered and do not overlap
  for (let i = 1; i < pages.length; i++) assert.ok(pages[i].startFrame >= pages[i - 1].startFrame);
});

test("music ducks while speaking and recovers after", () => {
  const env = buildDuckEnvelope([[100, 200]], 400, 0.4, 8);
  assert.equal(env[0], 1);
  assert.ok(Math.abs(env[150] - 0.4) < 1e-6);
  assert.equal(env[399], 1);
  assert.ok(env[96] < 1 && env[96] > 0.4, "ramps in before speech");
  assert.ok(env.every((v) => v >= 0.4 - 1e-6 && v <= 1));
});

test("schema: new visual fields validate, bad ones are rejected", () => {
  const ok = StickmanVisualSchema.safeParse({
    camera: "whip", cameraFocus: { x: 0.2, y: 0.7 }, backdrop: "aurora", transition: "flip",
    stickers: [{ emoji: "1f525" }], broll: { src: "content/x/broll/a.mp4" }, leak: true,
  });
  assert.ok(ok.success);
  assert.equal(StickmanVisualSchema.parse({}).transition, "auto");
  assert.equal(StickmanVisualSchema.parse({}).backdrop, "dots");
  assert.ok(!StickerSchema.safeParse({ emoji: "fire" }).success);
  assert.ok(!StickmanVisualSchema.safeParse({ camera: "spin" }).success);
  assert.ok(!StickmanVisualSchema.safeParse({ stickers: Array(7).fill({ emoji: "1f525" }) }).success);
});

test("every existing project's visuals still validate with the new schema", () => {
  const root = path.join(process.cwd(), "public", "content");
  let checked = 0;
  for (const slug of fs.readdirSync(root)) {
    const file = path.join(root, slug, "video.json");
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (data.template !== "stickman") continue;
    assert.deepEqual(validateStickmanScenes(data.scenes), [], `${slug} has invalid visuals`);
    // and the timeline builds without throwing
    buildTimeline(data.scenes, data.fps ?? FPS);
    checked++;
  }
  assert.ok(checked > 0, "no stickman projects found");
});

test("referenced local assets exist (lottie, b-roll, rive)", () => {
  const pub = path.join(process.cwd(), "public");
  const root = path.join(pub, "content");
  const missing: string[] = [];
  for (const slug of fs.readdirSync(root)) {
    const file = path.join(root, slug, "video.json");
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (data.template !== "stickman") continue;
    for (const s of data.scenes) {
      for (const st of s.visual?.stickers ?? []) {
        const f = `lottie/${String(st.emoji).toLowerCase()}.json`;
        if (!fs.existsSync(path.join(pub, f))) missing.push(`${slug}/${s.id}: ${f}`);
      }
      for (const f of [s.visual?.broll?.src, s.visual?.rive?.src].filter(Boolean)) {
        if (!fs.existsSync(path.join(pub, f))) missing.push(`${slug}/${s.id}: ${f}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test("figureFraction: panels tuck the figure left, flip mirrors, vertical centres", () => {
  assert.ok(Math.abs(figureFraction(StickmanVisualSchema.parse({ code: { lines: ["a"] } }), false) - 0.14) < 1e-9);
  assert.equal(figureFraction(StickmanVisualSchema.parse({ figureX: 0.6, flip: true }), false), 0.4);
  assert.equal(figureFraction(StickmanVisualSchema.parse({}), true), 0.5);
});
