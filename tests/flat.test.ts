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
