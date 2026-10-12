import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { probeDuration } from "../scripts/longs/util";
import { ff, hasFfmpeg } from "./helpers";

// Narration made elsewhere (Voicebox): longform:audio --external measures it instead of synthesising, the timeline follows
// the real files frame for frame, and longform:merge then builds a voiceover of exactly that length.
const slug = "__external-audio-test";
const root = path.join(process.cwd(), "public", "content", slug);
const audio = path.join(root, "audio");
const durs = [1.4, 2.65, 0.9];
const fps = 30;

function project(withFiles: number) {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(audio, { recursive: true });
  const scenes = durs.map((_, i) => ({ id: `s${i}`, text: `scene ${i}` }));
  fs.writeFileSync(path.join(root, "video.json"), JSON.stringify({ format: "longform", fps, voice: "hi-IN-MadhurNeural", scenes }));
  durs.slice(0, withFiles).forEach((d, i) => ff(["-f", "lavfi", "-i", `sine=frequency=${300 + i * 90}:duration=${d}`, "-c:a", "libmp3lame", path.join(audio, `segment_${i}_s${i}.mp3`)]));
}

const run = (script: string) => spawnSync("npx", ["tsx", script, "--project", slug, "--external"], { encoding: "utf-8" });

test("--external measures the supplied files and writes an exact timeline", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  try {
    project(3);
    const before = fs.readdirSync(audio).sort();
    const r = run("scripts/longs/generate-audio.ts");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /supplied/);
    assert.deepEqual(fs.readdirSync(audio).filter((f) => f.endsWith(".mp3")).sort(), before, "no file was synthesised or removed");

    const data = JSON.parse(fs.readFileSync(path.join(root, "video.json"), "utf-8"));
    let start = 0;
    data.scenes.forEach((s: any, i: number) => {
      const frames = Math.ceil(probeDuration(path.join(audio, `segment_${i}_s${i}.mp3`)) * fps);
      assert.equal(s.durationFrames, frames, `scene ${i} lasts as long as its audio`);
      assert.equal(s.startFrame, start, `scene ${i} starts where the previous one ends`);
      assert.equal(s.audioFile, `segment_${i}_s${i}.mp3`);
      start += frames;
    });
    assert.equal(data.totalFrames, start);

    const m = run("scripts/longs/merge-audio.ts");
    assert.equal(m.status, 0, m.stdout + m.stderr);
    assert.ok(Math.abs(probeDuration(path.join(audio, "voiceover.mp3")) - data.totalFrames / fps) < 0.25, "voiceover matches the timeline");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("--external fails clearly when a scene has no supplied audio", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  try {
    project(2);
    const r = run("scripts/longs/generate-audio.ts");
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /missing for 1 scene.*segment_2_s2\.mp3/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
