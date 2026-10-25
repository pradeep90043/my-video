/** Film shots: keyframes, schema, sounds. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { endFrame, val } from "../src/stickman/film/anim";
import { FilmSchema } from "../src/stickman/film/schema";
import { planFilmSounds } from "../src/stickman/film/filmSounds";
import { planSounds } from "../src/stickman/soundPlan";

const film = (layers: object[]) => FilmSchema.parse({ layers });

test("val: constants, tweens and key lists", () => {
  assert.equal(val(5, 10), 5);
  assert.equal(val(undefined, 3, 7), 7);
  assert.equal(val({ from: 0, to: 100, at: 10, dur: 20, ease: "linear" }, 20), 50);
  assert.equal(val({ from: 0, to: 100, at: 10, dur: 20 }, 0), 0);
  assert.equal(val({ from: 0, to: 100, at: 10, dur: 20 }, 99), 100);
  assert.equal(val({ keys: [[0, 10], [10, 20], [20, 0]], ease: "linear" }, 15), 10);
  assert.equal(endFrame({ from: 0, to: 1, at: 5, dur: 10 }), 15);
  assert.equal(endFrame({ keys: [[0, 1], [40, 2]] }), 40);
});

test("schema accepts a shot, applies defaults, and rejects unknown layers", () => {
  const f = film([{ t: "env", kind: "shop-counter" }, { t: "person", who: "seller" }, { t: "caption", text: "Hi" }]);
  assert.equal(f.layers.length, 3);
  assert.equal(f.cam.zoom, 1);
  assert.ok(!FilmSchema.safeParse({ layers: [{ t: "dragon" }] }).success);
  assert.ok(!FilmSchema.safeParse({ layers: [{ t: "env", kind: "moon" }] }).success);
});

test("an alarm that rings stops when the button is pressed, and the press clicks", () => {
  const cues = planFilmSounds(film([{ t: "phone", ring: true, pressAt: 60 }]), 150);
  const ring = cues.find((c) => c.name === "phone-alarm")!;
  assert.equal(ring.frame, 0);
  assert.ok(Math.abs(ring.seconds! - 2) < 1e-9);
  assert.ok(cues.some((c) => c.name === "click" && c.frame === 60));
});

test("calendar marks squeak when drawn, and a crumple tween crumples", () => {
  const cues = planFilmSounds(film([{ t: "calendar", marks: [{ c: 0, r: 0, at: 20 }, { c: 1, r: 0, at: 60 }], crumple: { from: 0, to: 1, at: 80, dur: 30 } }]), 200);
  assert.deepEqual(cues.filter((c) => c.name === "marker-write").map((c) => c.frame), [20, 60]);
  assert.ok(cues.some((c) => c.name === "paper-crumple" && c.frame === 82));
});

test("typing, walking and a box landing make sounds; static things do not", () => {
  const cues = planFilmSounds(film([
    { t: "env", kind: "shop-counter" }, { t: "person", who: "customer", pose: "walk", x: { from: 0, to: 900, dur: 60 } },
    { t: "phone", mode: "keyboard", text: "1 MIN", typeFrom: 10 }, { t: "books", kind: "box", at: 40 },
  ]), 150);
  const names = cues.map((c) => c.name);
  assert.ok(names.includes("footsteps-wood") && names.includes("typing-soft") && names.includes("thud"));
  assert.equal(planFilmSounds(film([{ t: "env", kind: "black" }, { t: "books", kind: "pair" }]), 150).length, 0);
});

test("planSounds gives a film shot its action cues and the layered ambience of its place", () => {
  const scene = (grade: string) => [{ text: "", startFrame: 0, durationFrames: 150, visual: { film: { layers: [{ t: "env", kind: "desk-night", grade }, { t: "phone", ring: true }] } } }];
  const plan = planSounds(scene("night"), 30);
  assert.ok(plan.foley.some((f) => f.name === "phone-alarm"));
  assert.deepEqual(plan.ambient.map((a) => a.name).sort(), ["night", "room"]);
  assert.ok(planSounds(scene("rain"), 30).ambient.some((a) => a.name === "rain-window"));
});
