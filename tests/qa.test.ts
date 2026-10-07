import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { qaVideo } from "../scripts/longs/qa";
import { ff, hasFfmpeg } from "./helpers";

const opts = { width: 640, height: 360, fps: 30, expectedSecs: 3 };
const skip = !hasFfmpeg && "ffmpeg not installed";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-"));
const src = ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30:duration=3"];
const tone = ["-f", "lavfi", "-i", "sine=frequency=440:duration=3"];

test("good video passes QA", { skip }, () => {
  const f = path.join(dir, "good.mp4");
  ff([...src, ...tone, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", f]);
  const r = qaVideo(f, opts);
  assert.deepEqual(r.errors, []);
});

test("full-range yuvj420p is rejected", { skip }, () => {
  const f = path.join(dir, "j.mp4");
  ff([...src, ...tone, "-c:v", "libx264", "-pix_fmt", "yuvj420p", "-c:a", "aac", f]);
  assert.ok(qaVideo(f, opts).errors.some((e) => e.includes("pixel format")));
});

test("missing audio, wrong size and wrong duration are rejected", { skip }, () => {
  const f = path.join(dir, "noaudio.mp4");
  ff([...src, "-c:v", "libx264", "-pix_fmt", "yuv420p", f]);
  const errors = qaVideo(f, { ...opts, width: 1280, expectedSecs: 10 }).errors.join("|");
  assert.match(errors, /no audio/);
  assert.match(errors, /resolution/);
  assert.match(errors, /duration/);
});

test("silent audio is rejected", { skip }, () => {
  const f = path.join(dir, "silent.mp4");
  ff([...src, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "3", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", f]);
  assert.ok(qaVideo(f, opts).errors.some((e) => e.includes("silent")));
});

test("unreadable file is rejected", { skip }, () => {
  const f = path.join(dir, "junk.mp4");
  fs.writeFileSync(f, "not a video");
  assert.ok(qaVideo(f, opts).errors.length > 0);
});
