import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { quizTiming } from "../src/stickman/quizTiming";
import { probeDuration } from "../scripts/longs/util";
import { ff, hasFfmpeg } from "./helpers";

test("default quiz: countdown from the start, answer at revealAt of the scene", () => {
  const t = quizTiming({ durationFrames: 300, revealAt: 0.65, fps: 30 });
  assert.equal(t.timerStart, 14);
  assert.equal(t.revealFrame, 195);
});

test("pause-the-video quiz: the countdown starts when the narration ends and the answer shows 1.5 s before the scene ends", () => {
  // 8 s of narration, then 9.5 s of thinking time: a 17.5 s scene
  const t = quizTiming({ durationFrames: 525, revealAt: 0.6, revealBeforeEnd: 1.5, speakEnd: 240, fps: 30 });
  assert.equal(t.timerStart, 240, "no countdown while the narrator is still asking");
  assert.equal(t.revealFrame, 525 - 45);
  assert.ok(t.revealFrame - t.timerStart >= 30, "at least a second of countdown");
});

test("pause-the-video quiz without narration timing still counts down and reveals at the end", () => {
  const t = quizTiming({ durationFrames: 300, revealAt: 0.6, revealBeforeEnd: 2, fps: 30 });
  assert.equal(t.timerStart, 14);
  assert.equal(t.revealFrame, 240);
});

test("the reveal never lands before the countdown or after the scene", () => {
  for (const [dur, end] of [[100, 95], [60, 59], [900, 100], [900, 899]] as const) {
    const t = quizTiming({ durationFrames: dur, revealAt: 0.6, revealBeforeEnd: 1.5, speakEnd: end, fps: 30 });
    assert.ok(t.revealFrame >= t.timerStart, `dur ${dur} end ${end}: reveal ${t.revealFrame} vs start ${t.timerStart}`);
    assert.ok(t.revealFrame < dur, `dur ${dur}: reveal inside the scene`);
  }
});

// A scene's pauseAfter is silence after its line: longform:audio adds it to the scene length and the merge pads the audio to it.
const slug = "__pause-after-test";
const root = path.join(process.cwd(), "public", "content", slug);
const audio = path.join(root, "audio");

test("pauseAfter keeps the scene going, silent, after its line", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  try {
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(audio, { recursive: true });
    const fps = 30;
    const scenes = [{ id: "q", text: "pause and answer", pauseAfter: 6 }, { id: "a", text: "the answer is b" }];
    fs.writeFileSync(path.join(root, "video.json"), JSON.stringify({ format: "longform", fps, voice: "hi-IN-MadhurNeural", scenes }));
    [1.5, 2.0].forEach((d, i) => ff(["-f", "lavfi", "-i", `sine=frequency=${300 + i * 90}:duration=${d}`, "-c:a", "libmp3lame", path.join(audio, `segment_${i}_${scenes[i].id}.mp3`)]));
    const run = (script: string) => spawnSync("npx", ["tsx", script, "--project", slug, "--external"], { encoding: "utf-8" });
    const r = run("scripts/longs/generate-audio.ts");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const data = JSON.parse(fs.readFileSync(path.join(root, "video.json"), "utf-8"));
    const q = data.scenes[0];
    const spoken = probeDuration(path.join(audio, "segment_0_q.mp3"));
    assert.equal(q.durationFrames, Math.ceil((spoken + 6) * fps), "the scene lasts its line plus the thinking time");
    assert.ok(Math.abs(q.duration - spoken) < 1e-6, "scene.duration stays the speech only (captions and mouth follow it)");
    assert.equal(data.scenes[1].startFrame, q.durationFrames, "the next scene starts after the thinking time");
    const m = run("scripts/longs/merge-audio.ts");
    assert.equal(m.status, 0, m.stdout + m.stderr);
    assert.ok(Math.abs(probeDuration(path.join(audio, "voiceover.mp3")) - data.totalFrames / fps) < 0.25, "the voiceover is padded with silence to the timeline");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
