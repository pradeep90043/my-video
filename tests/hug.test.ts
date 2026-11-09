import { test } from "node:test";
import assert from "node:assert/strict";
import { direct } from "../src/stickman/film/direct";
import { frontHandWorld, personState } from "../src/stickman/film/rig";
import { smoothness } from "../src/stickman/film/lint";

const shot = {
  secs: 8, place: "park" as const,
  props: [{ id: "gift", kind: "gift" as const, at: 0.2, on: "floor" }],
  cast: [{ id: "maa", who: "seller" as const, at: 0.25 }, { id: "ravi", who: "student" as const, at: 0.75 }],
  actions: [
    { at: 0.3, who: "maa", do: "pick" as const, target: "gift" },
    { at: 2.0, who: "maa", do: "give" as const, target: "ravi" },
    { at: 4.0, who: "ravi", do: "hug" as const, target: "maa" },
  ],
};

test("a hug: the gift is put down first, then each hand rests on the other's back and that arm is drawn over the other body", () => {
  const { film, warnings } = direct(shot);
  assert.ok(!warnings.some((w) => w.includes("hands full")), warnings.join("; "));
  const people = film.layers.map((l, i) => [l, i] as const).filter(([l]) => l.t === "person") as [any, number][];
  assert.equal(people.length, 2);
  for (const [l, i] of people) {
    assert.ok(l.armOver?.length, "an arm goes over the partner");
    const [from, until] = l.armOver[0];
    const mid = Math.round((from + until) / 2);
    const hug = l.reach.find((r: any) => r.hold);
    const [hx, hy] = frontHandWorld(personState(l, i, mid), mid);
    assert.ok(Math.hypot(hx - hug.x, hy - hug.y) < 3, `hand on the back (${hx.toFixed(0)},${hy.toFixed(0)} vs ${hug.x.toFixed(0)},${hug.y.toFixed(0)})`);
    // the partner's back is on the far side of the partner
    const other = people.find(([, j]) => j !== i)!;
    const me = personState(l, i, mid).place.x, them = personState(other[0], other[1], mid).place.x;
    assert.ok(Math.sign(hug.x - them) === Math.sign(them - me), "hand behind the partner, not in front");
  }
  // the gift ended on the floor, not in a hand during the hug
  const gift = film.layers.find((l: any) => l.t === "prop" && l.kind === "gift") as any;
  const last = gift.held[gift.held.length - 1];
  assert.ok(last.until !== undefined, "the gift was let go before the hug");
});

test("carrying a gift uses both hands; nothing pops or jumps", () => {
  const { film } = direct(shot);
  const maa = film.layers.findIndex((l: any) => l.t === "person");
  const st = personState(film.layers[maa] as any, maa, 50);
  assert.ok(st.pose.carry, "maa carries");
  assert.ok(Math.abs(st.pose.armB[0] - st.pose.armF[0]) < 10, "the back arm is on the gift too");
  const pops = smoothness(film, 240);
  assert.deepEqual(pops.map((p) => `${p.frame} ${p.detail}`), []);
});
