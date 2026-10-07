import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEdgeTtsSettings, validateVideoJson } from "../scripts/longs/lib";
import { StickmanVisualSchema, validateStickmanScenes } from "../src/stickman/schema";

const valid = { format: "longform", fps: 30, voice: "hi-IN-MadhurNeural", scenes: [{ id: "a", text: "hi" }] };

test("valid video.json passes", () => assert.deepEqual(validateVideoJson(valid), []));

test("rejects empty text, duplicate ids, bad fps, missing scenes", () => {
  assert.ok(validateVideoJson({ ...valid, scenes: [{ id: "a", text: "  " }] }).length > 0);
  assert.ok(validateVideoJson({ ...valid, scenes: [{ id: "a", text: "x" }, { id: "a", text: "y" }] }).some((p) => p.includes("duplicate")));
  assert.ok(validateVideoJson({ ...valid, fps: 3 }).length > 0);
  assert.ok(validateVideoJson({ ...valid, scenes: [] }).length > 0);
});

test("edge-tts settings: accepts +5% / -10% / +0Hz, rejects bad values and non-edge voices", () => {
  assert.deepEqual(validateEdgeTtsSettings("hi-IN-MadhurNeural", "-10%", "+0Hz"), []);
  assert.ok(validateEdgeTtsSettings("onyx", "+0%", "+0Hz").length > 0);
  assert.ok(validateEdgeTtsSettings("hi-IN-MadhurNeural", "fast", "+0Hz").length > 0);
  assert.ok(validateEdgeTtsSettings("hi-IN-MadhurNeural", "+0%", "5").length > 0);
});

test("stickman visual: defaults applied, bad values reported", () => {
  const v = StickmanVisualSchema.parse({});
  assert.equal(v.pose, "idle");
  assert.deepEqual(v.props, []);
  const problems = validateStickmanScenes([{ id: "s1", visual: { pose: "backflip" } }, { id: "s2", visual: { props: [{ type: "unicorn" }] } }]);
  assert.equal(problems.length, 2);
  assert.ok(problems[0].includes("s1"));
});

test("committed stickman demo project is valid", () => {
  const demo = require("../public/content/stickman-demo/video.json");
  assert.deepEqual(validateVideoJson(demo), []);
  assert.deepEqual(validateStickmanScenes(demo.scenes), []);
});
