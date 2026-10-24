/** Drawn characters (puppet rig): validation, SVG safety, smooth pose blending. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizeSvg, validatePuppet, paint, type PuppetSpec } from "../src/stickman/story/puppet/spec";
import { boneAngle, channelsFor, mixChannels, type Channels } from "../src/stickman/story/puppet/animate";
import { generatePuppet, extractJson } from "../src/stickman/story/puppet/generate";
import { CHAR_POSES } from "../src/stickman/story/cast";

const elephant: PuppetSpec = JSON.parse(readFileSync("src/stickman/story/puppet/examples/elephant.json", "utf8"));

test("the example elephant is a valid puppet", () => {
  assert.deepEqual(validatePuppet(elephant), []);
});

test("sanitizeSvg accepts plain shapes and rejects anything active", () => {
  assert.ok(sanitizeSvg('<circle cx="1" cy="2" r="3" fill="$fur" stroke="#222" stroke-width="2"/>'));
  assert.equal(sanitizeSvg('<script>alert(1)</script>'), null);
  assert.equal(sanitizeSvg('<circle r="3" onload="x()"/>'), null);
  assert.equal(sanitizeSvg('<image href="http://x/y.png"/>'), null);
  assert.equal(sanitizeSvg('<path d="M0,0 L1,1" style="fill:red"/>'), null);
  assert.equal(sanitizeSvg('<g><text>hi</text></g>'), null);
  assert.equal(sanitizeSvg('plain text'), null);
  assert.equal(sanitizeSvg('<rect width="1" height="1" fill="url(http://evil)"/>'), null);
});

test("validatePuppet reports structural problems", () => {
  const bad = { ...elephant, bones: elephant.bones.map((b) => (b.id === "ear" ? { ...b, parent: "nope" } : b)) };
  assert.ok(validatePuppet(bad).some((i) => i.bone === "ear" && /parent/.test(i.problem)));
  const two = { ...elephant, bones: elephant.bones.map((b) => (b.id === "tail" ? { ...b, parent: null } : b)) };
  assert.ok(validatePuppet(two).some((i) => /root/.test(i.problem)));
  const evil = { ...elephant, bones: elephant.bones.map((b) => (b.id === "tail" ? { ...b, svg: "<script/>" } : b)) };
  assert.ok(validatePuppet(evil).some((i) => i.bone === "tail"));
});

test("palette tokens are replaced, unknown ones fall back to the outline colour", () => {
  assert.equal(paint('fill="$fur" stroke="$nope"', { fur: "#111111", out: "#222222" }), 'fill="#111111" stroke="#222222"');
});

test("every pose gives finite channels and finite bone angles", () => {
  for (const pose of CHAR_POSES) for (const frame of [0, 7, 40, 133]) {
    const c = channelsFor(pose, { frame, talking: true, mouthLevel: 0.6 });
    for (const [k, v] of Object.entries(c)) assert.ok(Number.isFinite(v), `${pose}.${k}`);
    for (const b of elephant.bones) assert.ok(Number.isFinite(boneAngle(b, c)), `${pose}/${b.id}`);
  }
});

test("blending is continuous: ends equal the poses, and no bone jumps between frames", () => {
  const input = { frame: 50 };
  const a = channelsFor("walk", input), b = channelsFor("eat", input);
  const close = (x: Channels, y: Channels) => (Object.keys(x) as (keyof Channels)[]).forEach((k) => assert.ok(Math.abs(x[k] - y[k]) < 1e-9, k));
  close(mixChannels(a, b, 0), a);
  close(mixChannels(a, b, 1), b);
  // sweep the blend weight in 1/20 steps over a fixed frame: the largest per-step change of any bone stays small (no snapping)
  let worst = 0;
  for (let s = 0; s < 20; s++) {
    const c0 = mixChannels(a, b, s / 20), c1 = mixChannels(a, b, (s + 1) / 20);
    for (const bone of elephant.bones) worst = Math.max(worst, Math.abs(boneAngle(bone, c1) - boneAngle(bone, c0)));
  }
  assert.ok(worst < 8, `largest bone step ${worst.toFixed(2)} deg`);
});

test("an oscillating pose changes smoothly from frame to frame", () => {
  for (const pose of ["walk", "run", "dance", "struggle", "happy"] as const) {
    let worst = 0, prev = channelsFor(pose, { frame: 0 });
    for (let f = 1; f < 120; f++) {
      const c = channelsFor(pose, { frame: f });
      for (const bone of elephant.bones) worst = Math.max(worst, Math.abs(boneAngle(bone, c) - boneAngle(bone, prev)));
      prev = c;
    }
    assert.ok(worst < 30, `${pose}: largest per-frame bone step ${worst.toFixed(1)} deg`);
  }
});

test("generatePuppet retries with the exact problems until the drawing is valid", async () => {
  const prompts: string[] = [];
  const broken = { ...elephant, bones: elephant.bones.map((b) => (b.id === "ear" ? { ...b, parent: "nope" } : b)) };
  const answers = ["sorry, here you go: not json", "```json\n" + JSON.stringify(broken) + "\n```", JSON.stringify(elephant)];
  const r = await generatePuppet("a grey elephant", elephant, async (p) => { prompts.push(p); return answers[prompts.length - 1]; });
  assert.equal(r.attempts, 3);
  assert.match(prompts[1], /not valid JSON/);
  assert.match(prompts[2], /bone "ear": parent nope not found/);
  assert.deepEqual(validatePuppet(r.spec), []);
});

test("generatePuppet gives up after the attempts and says why", async () => {
  await assert.rejects(generatePuppet("x", elephant, async () => "nope", 2), /after 2 attempts/);
  assert.throws(() => extractJson("no braces"));
});
