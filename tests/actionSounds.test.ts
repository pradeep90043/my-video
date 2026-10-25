/** Action-driven sounds + layered ambience. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planActionSounds, stepSound, walkFrames } from "../src/stickman/actionSounds";
import { planSounds } from "../src/stickman/soundPlan";
import { placeLayers } from "../src/stickman/sounds";
import { StorySchema } from "../src/stickman/schema";

const W = 1080;
const story = (o: object) => StorySchema.parse({ bg: "street", chars: [{ id: "a", x: 50 }], ...o });
const names = (s: ReturnType<typeof story>, dur = 150) => planActionSounds(s, dur, { w: W }).map((c) => c.name);

test("the floor decides the footsteps", () => {
  assert.equal(stepSound("room_night"), "footsteps-wood");
  assert.equal(stepSound("forest"), "footsteps-grass");
  assert.equal(stepSound("street"), "footsteps");
});

test("a character who walks in gets footsteps for exactly the frames of the walk", () => {
  const cues = planActionSounds(story({ chars: [{ id: "a", x: 70 }] }), 150, { w: W });
  const steps = cues.find((c) => c.name === "footsteps")!;
  const dist = Math.abs(0.7 * W - W * 1.2);
  assert.equal(steps.frame, 0);
  assert.ok(Math.abs(steps.seconds! - (walkFrames(dist) / 30 + 0.1)) < 1e-9);
});

test("a character who stays (cont, no fromX) makes no entrance footsteps", () => {
  assert.ok(!names(story({ cont: true, chars: [{ id: "a", x: 70 }] })).includes("footsteps"));
});

test("a run pose is a run, a short walk is a walk", () => {
  assert.ok(names(story({ cont: true, chars: [{ id: "a", pose: "run" }] })).includes("run"));
  assert.ok(names(story({ cont: true, chars: [{ id: "a", x: 55, fromX: 40 }] })).includes("footsteps"));
});

test("poses and held things make their own sounds", () => {
  assert.ok(names(story({ cont: true, chars: [{ id: "a", pose: "sleep" }] })).includes("breath"));
  const jump = names(story({ cont: true, chars: [{ id: "a", pose: "jump" }] }));
  assert.ok(jump.includes("whoosh") && jump.includes("thud"));
  assert.ok(names(story({ cont: true, chars: [{ id: "a", holds: "phone" }] })).includes("click"));
  assert.ok(names(story({ props: [{ type: "clock", x: 50 }] })).includes("clock-tick"));
});

test("cues stay inside the scene and one sound is never doubled within a quarter second", () => {
  const cues = planActionSounds(story({ cont: true, chars: [{ id: "a", pose: "fight" }, { id: "b", pose: "fight", x: 60 }] }), 150, { w: W });
  assert.ok(cues.every((c) => c.frame >= 0 && c.frame < 150));
  const punches = cues.filter((c) => c.name === "punch").map((c) => c.frame);
  assert.ok(punches.every((f, i) => i === 0 || f - punches[i - 1] >= 8));
});

test("planSounds adds action cues unless the author named that sound, and can be switched off", () => {
  const visual = { story: { bg: "room_night", chars: [{ id: "a", pose: "sleep" }], cont: true } };
  const sc = [{ text: "x", startFrame: 0, durationFrames: 150, visual }];
  assert.ok(planSounds(sc, 30).foley.some((f) => f.name === "breath"));
  assert.ok(!planSounds(sc, 30, { autoSound: false }).foley.some((f) => f.name === "breath"));
  const own = [{ ...sc[0], visual: { ...visual, foley: [{ name: "breath", at: 1 }] } }];
  assert.equal(planSounds(own, 30).foley.filter((f) => f.name === "breath").length, 1);
});

test("a place is layered, and a layer continuing across scenes is one segment", () => {
  assert.deepEqual(placeLayers("room_night", "night", "none").map((l) => l.name), ["room", "night"]);
  assert.ok(placeLayers("street", "day", "rain").some((l) => l.name === "rain"));
  const visual = { story: { bg: "street", chars: [{ id: "a" }], cont: true } };
  const sc = [0, 1, 2].map((i) => ({ text: "x", startFrame: i * 150, durationFrames: 150, visual }));
  const city = planSounds(sc, 30).ambient.filter((a) => a.name === "city");
  assert.equal(city.length, 1);
  assert.deepEqual([city[0].from, city[0].to], [0, 450]);
  // an explicit main bed is not doubled by its own layer
  const main = planSounds(sc.map((s) => ({ ...s, visual: { ...visual, ambient: "city" } })), 30).ambient.filter((a) => a.name === "city");
  assert.equal(main.length, 1);
});
