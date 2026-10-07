import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { probeDuration } from "../scripts/longs/util";
import { ff, hasFfmpeg } from "./helpers";

// Segments with awkward durations: plain concat would drift from the frame grid.
test("merged voiceover is frame-exact against the scene timeline", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const slug = "__merge-test";
  const root = path.join(process.cwd(), "public", "content", slug);
  const audio = path.join(root, "audio");
  fs.mkdirSync(audio, { recursive: true });
  try {
    const fps = 30;
    const durs = [1.013, 2.507, 0.941, 1.777];
    const scenes = durs.map((d, i) => {
      const file = `segment_${i}_s${i}.mp3`;
      ff(["-f", "lavfi", "-i", `sine=frequency=${300 + i * 100}:duration=${d}`, "-c:a", "libmp3lame", path.join(audio, file)]);
      return { id: `s${i}`, text: "x", audioFile: file, durationFrames: Math.ceil(d * fps) };
    });
    const totalFrames = scenes.reduce((n, s) => n + s.durationFrames, 0);
    fs.writeFileSync(
      path.join(root, "video.json"),
      JSON.stringify({ format: "longform", fps, voice: "v", totalFrames, scenes }),
    );
    const r = spawnSync("npx", ["tsx", "scripts/longs/merge-audio.ts", "--project", slug], { encoding: "utf-8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const actual = probeDuration(path.join(audio, "voiceover.mp3"));
    assert.ok(Math.abs(actual - totalFrames / fps) < 0.1, `got ${actual}, want ${totalFrames / fps}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
