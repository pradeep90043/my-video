import { test } from "node:test";
import assert from "node:assert/strict";
import horse from "../src/stickman/story/puppet/examples/horse.json";
import { direct } from "../src/stickman/film/direct";
import { creatureState, seatWorld } from "../src/stickman/film/creature";
import { PROPS } from "../src/stickman/film/props";

const crown = { svg: '<polygon points="-50,0 -60,-70 0,-80 60,-70 50,0" fill="#FFB800"/>', w: 120, h: 80, mount: "surface" as const, grip: [0, -30] as [number, number] };

test("a thing the planner drew is placed, picked up and carried like a catalog thing", () => {
  const { film, warnings } = direct({ secs: 4, place: "park", props: [{ id: "crown", draw: crown, at: 0.6, on: "floor" }], cast: [{ id: "a", who: "student", at: 0.4 }], actions: [{ at: 0.2, who: "a", do: "pick", target: "crown" }] });
  assert.deepEqual(warnings, []);
  const l = film.layers.find((x: any) => x.t === "prop" && x.kind === "drawn-crown") as any;
  assert.ok(l?.art?.svg && l.held?.length, "drawn prop with its art, held");
  assert.equal(PROPS["drawn-crown" as keyof typeof PROPS].w, 120);
});

test("a drawn creature walks like a person; its rider sits on its seat and goes where it goes", () => {
  const { film, warnings } = direct({
    secs: 4, place: "park",
    cast: [{ id: "ghoda", draw: horse, at: 0.2 }, { id: "raja", who: "customer", rides: "ghoda" }],
    actions: [{ at: 0.2, who: "raja", do: "run", to: 0.7 }, { at: 1, who: "ghoda", do: "pick", target: "raja" }],
  });
  assert.ok(warnings.some((w) => w.includes("cannot do that")), "a creature has no hands");
  const ci = film.layers.findIndex((x: any) => x.t === "creature");
  const rider = film.layers.find((x: any) => x.t === "person") as any;
  assert.equal(rider.rideOn, ci);
  const c = film.layers[ci] as any;
  const a = creatureState(c, 0), b = creatureState(c, 100);
  assert.ok(b.x > a.x + 300, "the horse (not the rider alone) moved");
  const seat = seatWorld(c.spec, b, 100)!;
  assert.ok(Math.abs(seat[0] - b.x) < 200 && seat[1] < b.y - 200, "the seat is on its back");
  // galloping: the seat rises and falls
  const ys = Array.from({ length: 20 }, (_, i) => seatWorld(c.spec, creatureState(c, 40 + i), 40 + i)![1]);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 5, "the rider bobs with the gallop");
});
