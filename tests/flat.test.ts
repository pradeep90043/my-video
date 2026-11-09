import { test } from "node:test";
import assert from "node:assert/strict";
import { CharacterSchema, ShotSchema, FLAT_CATALOG } from "../src/flat/spec";
import { solveArm, stateAt } from "../src/flat/Character";
import { CastInShotSchema } from "../src/flat/spec";

test("flat: unknown parts fall back, a bad cast entry is dropped alone, long lists are cut", () => {
  const c = CharacterSchema.parse({ id: "x", hair: "mohawk", headwear: "spacesuit", upperColor: "red", accessories: ["necklace", "laser"] });
  assert.deepEqual([c.hair, c.headwear, c.upperColor, c.accessories], ["short", "none", "#3e6fa8", ["necklace"]]);
  const s = ShotSchema.parse({ bg: "moon", cast: [{ id: "a" }, { id: 5 }, ...Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` }))] });
  assert.equal(s.bg, "plain");
  assert.equal(s.cast.length, 8, "the bad entry is dropped, the rest cut to 8");
  assert.equal(s.cast[0].id, "a");
  assert.ok(FLAT_CATALOG.gestures.includes("namaste") && FLAT_CATALOG.graphics.includes("calendar"));
});

test("flat: arms reach their targets, and a hand near the shoulder foreshortens instead of folding out", () => {
  const S = { x: 80, y: -660 };
  for (const T of [{ x: 300, y: -660 }, { x: 150, y: -900 }, { x: 0, y: -580 }]) {
    const { H } = solveArm(S, T, 1);
    assert.ok(Math.hypot(H.x - T.x, H.y - T.y) < 2, `reaches ${JSON.stringify(T)}`);
  }
  const near = solveArm(S, { x: 74, y: -585 }, 1, true);
  assert.ok(near.E.x - S.x < 90, "the elbow stays close to the body");
});

test("flat: beats change gesture and mood at their time, blended over a third of a second", () => {
  const cast = CastInShotSchema.parse({ id: "a", gesture: "cry", mood: "sad", beats: [{ at: 2, gesture: "raise", mood: "happy" }] });
  assert.deepEqual([stateAt(cast, 1).gesture, stateAt(cast, 1).mood], ["cry", "sad"]);
  const mid = stateAt(cast, 2.15);
  assert.equal(mid.prevGesture, "cry");
  assert.ok(mid.blend > 0 && mid.blend < 1);
  assert.equal(stateAt(cast, 3).blend, 1);
  assert.equal(stateAt(cast, 3).mood, "happy");
});

test("flat v2: framing, animals, set pieces, crowds and postures parse with safe fallbacks", () => {
  const s = ShotSchema.parse({
    bg: "village", framing: "close", crowd: 80,
    animals: [{ kind: "elephant", x: 0.4, color: "#eef0f2" }, { kind: "dragon" }, { kind: "cow", scale: 9 }],
    set: [{ kind: "hill", lift: 0.36 }, { kind: "castle" }],
    cast: [{ id: "indra", posture: "ride", rides: 0 }, { id: "x", posture: "fly" }],
  });
  assert.equal(s.framing, "close");
  assert.equal(s.crowd, 0, "an impossible crowd size falls back to none");
  assert.deepEqual(s.animals.map((a) => a.kind), ["elephant", "cow"], "an unknown animal is dropped alone");
  assert.equal(s.animals[1].scale, 1, "an impossible scale falls back");
  assert.deepEqual(s.set.map((p) => [p.kind, p.lift]), [["hill", 0.36]]);
  assert.deepEqual(s.cast.map((c) => [c.posture, c.rides]), [["ride", 0], ["stand", undefined]]);
  assert.equal(CharacterSchema.parse({ id: "g", head: "elephant" }).head, "elephant");
  assert.equal(CharacterSchema.parse({ id: "g", head: "robot" }).head, "human");
});
