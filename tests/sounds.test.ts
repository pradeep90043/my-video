/** Ambience + foley planning. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ambientEnvelope, planSounds, type PlanScene } from "../src/stickman/soundPlan";
import { detectAmbient, detectFoley } from "../src/stickman/sounds";
import { StickmanVisualSchema } from "../src/stickman/schema";

const FPS = 30;
function scenes(n: number, visual: (i: number) => unknown = () => ({})): PlanScene[] {
  return Array.from({ length: n }, (_, i) => ({ text: "alpha beta gamma delta", startFrame: i * 150, durationFrames: 150, pauseBefore: 0.2, visual: visual(i) }));
}

test("detectFoley finds action words and ignores tech-jargon look-alikes", () => {
  assert.deepEqual(detectFoley("He walked to the door and knocked".split(" ")).map((c) => c.foley), ["footsteps", "door-open"]);
  assert.deepEqual(detectFoley("Then we run the tests and walk through the code".split(" ")), []);
  assert.equal(detectFoley("the door slammed shut".split(" "))[0].foley, "door-close");
  assert.equal(detectFoley("she heard the alarm".split(" "))[0].foley, "alarm");
});

test("detectAmbient picks a bed from the narration", () => {
  assert.equal(detectAmbient("It was raining outside"), "rain");
  assert.equal(detectAmbient("A thunderstorm hit the city"), "storm");
  assert.equal(detectAmbient("Good morning, let us brainstorm"), undefined);
});

test("explicit foley is timed from the narration start and capped at the scene end", () => {
  const plan = planSounds(scenes(1, () => ({ foley: [{ name: "stairs", at: 1, duration: 2 }] })), FPS);
  assert.equal(plan.foley[0].frame, 6 + 30); // pauseBefore 0.2 s + at 1 s
  assert.equal(plan.foley[0].durationFrames, 60);
  const long = planSounds(scenes(1, () => ({ foley: [{ name: "footsteps", at: 4 }] })), FPS);
  assert.equal(long.foley[0].frame + long.foley[0].durationFrames, 150); // never plays past its scene
});

test("autoSound adds foley synced to the spoken word; off disables it; explicit foley replaces it", () => {
  const sc = scenes(1);
  sc[0].text = "he walked in";
  sc[0].words = [{ text: "he", start: 0.1, end: 0.3 }, { text: "walked", start: 0.5, end: 0.9 }, { text: "in", start: 1, end: 1.2 }];
  const on = planSounds(sc, FPS);
  assert.equal(on.foley[0].name, "footsteps");
  assert.equal(on.foley[0].frame, 6 + 15);
  assert.equal(planSounds(sc, FPS, { autoSound: false }).foley.length, 0);
  sc[0].visual = { foley: [{ name: "knock" }] };
  assert.deepEqual(planSounds(sc, FPS).foley.map((f) => f.name), ["knock"]);
});

test("ambience: explicit beds persist until changed, auto beds fade after a few scenes", () => {
  const explicit = planSounds(scenes(5, (i) => (i === 1 ? { ambient: "wind" } : i === 4 ? { ambient: "none" } : {})), FPS);
  assert.deepEqual(explicit.ambient.map((a) => [a.name, a.from, a.to]), [["wind", 150, 600]]);

  const sc = scenes(8);
  sc[1].text = "rain on the roof";
  const auto = planSounds(sc, FPS);
  assert.equal(auto.ambient.length, 1);
  assert.deepEqual([auto.ambient[0].name, auto.ambient[0].from, auto.ambient[0].to], ["rain", 150, 750]);
  assert.equal(planSounds(sc, FPS, { autoSound: false }).ambient.length, 0);

  const mixed = scenes(3, (i) => (i === 0 ? { ambient: "city" } : {}));
  mixed[1].text = "rain everywhere";
  assert.deepEqual(planSounds(mixed, FPS).ambient.map((a) => a.name), ["city"]);
});

test("ambientEnvelope fades in, holds, fades out", () => {
  assert.equal(ambientEnvelope(0, 100), 0);
  assert.equal(ambientEnvelope(50, 100), 1);
  assert.equal(ambientEnvelope(100, 100), 0);
});

test("ambient / foley schema validation", () => {
  assert.ok(StickmanVisualSchema.safeParse({ ambient: "rain", foley: [{ name: "stairs", at: 0.5 }] }).success);
  assert.ok(!StickmanVisualSchema.safeParse({ ambient: "volcano" }).success);
  assert.ok(!StickmanVisualSchema.safeParse({ foley: [{ name: "gunshot" }] }).success);
});
