/** The director: shots in words become physically consistent layers. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { direct } from "../src/stickman/film/direct";
import { PROPS } from "../src/stickman/film/props";
import { POSES } from "../src/stickman/film/person";
import { frontHandLocal, frontHandWorld, personState, solveFrontArm } from "../src/stickman/film/rig";
import { val } from "../src/stickman/film/anim";
import { planFilmSounds } from "../src/stickman/film/filmSounds";
import type { FilmLayer } from "../src/stickman/film/schema";

type Prop = Extract<FilmLayer, { t: "prop" }>;
type Person = Extract<FilmLayer, { t: "person" }>;
const props = (layers: FilmLayer[]) => layers.filter((l): l is Prop => l.t === "prop");
const prop = (layers: FilmLayer[], kind: string) => props(layers).find((p) => p.kind === kind)!;
const people = (layers: FilmLayer[]) => layers.map((l, i) => [l, i] as const).filter((x): x is readonly [Person, number] => x[0].t === "person");

test("inverse kinematics puts the front hand exactly on a reachable point", () => {
  for (const pose of ["stand", "sit-chair", "walk"]) {
    const p = POSES[pose];
    for (const target of [[150, -330], [220, -250], [60, -420]] as [number, number][]) {
      const [a0, a1] = solveFrontArm(p, 12, 3, target);
      const [hx, hy] = frontHandLocal({ ...p, armF: [a0, a1] }, 12, 3);
      assert.ok(Math.hypot(hx - target[0], hy - target[1]) < 1, `${pose} ${target}: hand at ${hx.toFixed(1)},${hy.toFixed(1)}`);
    }
  }
});

test("a thing put on a desk stands on the desk's top", () => {
  const { film, warnings } = direct({ secs: 3, place: "study", props: [{ id: "mug", kind: "mug", on: "desk" }] });
  assert.deepEqual(warnings, []);
  const desk = prop(film.layers, "desk"), mug = prop(film.layers, "mug");
  assert.equal(mug.y, (desk.y as number) - PROPS.desk.top!.y * (desk.s as number));
  const half = (PROPS.desk.w * (desk.s as number)) / 2;
  assert.ok(Math.abs((mug.x as number) - (desk.x as number)) < half);
});

test("sitting puts the hip on the seat and the feet on the floor", () => {
  const { film } = direct({ secs: 3, place: "study", cast: [{ id: "a", sitOn: "chair" }] });
  const chair = prop(film.layers, "chair");
  const [p, i] = people(film.layers)[0];
  const st = personState(p, i, 0);
  const hip = st.place.y - 250 * st.place.s;
  const seatTop = (chair.y as number) - PROPS.chair.seat!.y * (chair.s as number);
  assert.ok(Math.abs(hip + 28 * st.place.s - seatTop) < 0.5, "thighs rest on the seat");
  const feet = hip + (p.seatSole ?? 228) * st.place.s; // person.tsx: seated soles are seatSole below the hip line
  assert.ok(Math.abs(feet - (chair.y as number)) < 3, `feet at ${feet}, floor at ${chair.y}`);
});

test("pick walks close, the hand reaches the thing, and then it rides in the hand", () => {
  const { film, warnings } = direct({ secs: 6, place: "kitchen", props: [{ id: "mug", kind: "mug", on: "counter", at: 0.2 }],
    cast: [{ id: "a", at: 0.9 }], actions: [{ at: 0.2, who: "a", do: "pick", target: "mug" }] });
  assert.deepEqual(warnings, []);
  const mug = prop(film.layers, "mug");
  const [p, i] = people(film.layers)[0];
  const grab = mug.held![0].from;
  const st = personState(p, i, grab);
  const [hx, hy] = frontHandWorld(st, grab);
  const g = PROPS.mug.grip!;
  const gx = (mug.x as number) + g[0] * (mug.s as number), gy = (mug.y as number) + g[1] * (mug.s as number);
  assert.ok(Math.hypot(hx - gx, hy - gy) < 6, `hand ${hx.toFixed(0)},${hy.toFixed(0)} vs grip ${gx.toFixed(0)},${gy.toFixed(0)}`);
  assert.equal(mug.held![0].by, i);
  // it walked: x changed and footsteps were planned for the walk
  assert.notEqual(val(p.x, 0), val(p.x, grab));
  assert.ok(film.foley.some((f) => f.name.startsWith("footsteps")));
});

test("give hands the thing from one person to the other", () => {
  const { film, warnings } = direct({ secs: 6, place: "room", props: [{ id: "gift", kind: "gift", on: "floor" }],
    cast: [{ id: "a", at: 0.3, holds: "gift" }, { id: "b", at: 0.7 }], actions: [{ at: 0.5, who: "a", do: "give", target: "b" }] });
  assert.deepEqual(warnings, []);
  const held = prop(film.layers, "gift").held!;
  const [[, ia], [, ib]] = people(film.layers);
  assert.equal(held[0].by, ia);
  assert.equal(held[1].by, ib);
  assert.equal(held[0].until, held[1].from);
});

test("mistakes become warnings, not broken frames", () => {
  const { warnings } = direct({ secs: 3, place: "park", cast: [{ id: "a" }], actions: [
    { at: 0, who: "a", do: "pick", target: "dragon" }, { at: 0, who: "zed", do: "walk", to: 0.5 }, { at: 1, who: "a", do: "put", target: "bench" },
  ] });
  assert.equal(warnings.length, 3);
});

test("the camera never shows past the set", () => {
  for (const shot of ["close", "medium", "full"] as const) {
    const { film } = direct({ secs: 3, place: "bedroom", cast: [{ id: "a", at: 0 }], camera: { shot, on: "a" } });
    for (const f of [0, 89]) {
      const z = val(film.cam.zoom, f, 1), x = val(film.cam.x, f, 960), y = val(film.cam.y, f, 540);
      assert.ok(x - 960 / z >= -0.01 && x + 960 / z <= 1920.01 && y - 540 / z >= -0.01 && y + 540 / z <= 1080.01, `${shot} frame ${f}`);
    }
  }
});

test("staged actions bring their sounds", () => {
  const { film } = direct({ secs: 6, place: "study", props: [{ id: "laptop", kind: "laptop", on: "desk" }], cast: [{ id: "a", sitOn: "chair" }],
    actions: [{ at: 0.5, who: "a", do: "use", target: "laptop", dur: 2 }] });
  const cues = planFilmSounds(film, 180);
  assert.ok(cues.some((c) => c.name === "typing-soft"));
});

test("faces follow the activity: side-on to the person spoken to, down at the keys, round to the camera when told", () => {
  const talk = direct({
    secs: 5, place: "living-room",
    cast: [{ id: "a", at: 0.35 }, { id: "b", at: 0.65 }],
    actions: [{ at: 0.4, who: "b", do: "say", target: "a", text: "Did you study?" }, { at: 3, who: "a", do: "look", target: "camera" }],
  }).film;
  const [[a, ai], [b, bi]] = people(talk.layers);
  const sa = personState(a, ai, 60), sb = personState(b, bi, 60);
  assert.ok(sa.pose.turn! > 0.85 && sb.pose.turn! > 0.85, `turns ${sa.pose.turn} ${sb.pose.turn}`);
  assert.ok(!sa.place.flip && sb.place.flip, "they face each other");
  assert.ok(b.talks?.length && b.talks[0][0] <= 60 && b.talks[0][1] > 30, "the speaker's mouth moves");
  assert.ok(personState(a, ai, 3 * 30 + 20).pose.turn! < 0.1, "turned to the camera");

  const work = direct({
    secs: 5, place: "study", props: [{ id: "laptop", kind: "laptop", on: "desk" }],
    cast: [{ id: "a", sitOn: "chair" }], actions: [{ at: 0.2, who: "a", do: "use", target: "laptop", dur: 3 }],
  }).film;
  const [[w, wi]] = people(work.layers);
  const sw = personState(w, wi, 60);
  assert.ok(sw.pose.head > POSES["sit-chair"].head + 5, `head bows to the keys (${sw.pose.head.toFixed(1)})`);
});

test("avatars: a child is smaller with dangling feet on a chair; kneeling knees and a fall land on the floor", () => {
  const { film, warnings } = direct({
    secs: 4, place: "study",
    cast: [{ id: "kid", age: "child", sitOn: "chair" }, { id: "b", at: 0.8, gender: "female", outfit: "saree", hair: "bun", skin: "tan" }],
    actions: [{ at: 0.2, who: "b", do: "kneel" }, { at: 2, who: "b", do: "fall" }],
  });
  assert.deepEqual(warnings, []);
  const [[kid, ki], [b, bi]] = people(film.layers);
  const ks = personState(kid, ki, 0), chair = prop(film.layers, "chair");
  assert.ok(ks.place.s < (chair.s as number) * 0.8, "a child is smaller");
  const feet = ks.place.y - 250 * ks.place.s + (kid.seatSole ?? 228) * ks.place.s;
  assert.ok(feet < (chair.y as number) - 5, "a child's feet dangle above the floor");
  assert.equal(b.avatar?.outfit, "saree");
  const floor = personState(b, bi, 0).place.y; // her own row's floor line
  const kn = personState(b, bi, 40);
  // KNEEL_DROP: the shins (148 below the hip) touch the floor
  assert.ok(Math.abs(kn.place.y - 250 * kn.place.s + 148 * kn.place.s - floor) < 2, `knees at the floor (${kn.place.y})`);
  const fl = personState(b, bi, 100);
  assert.equal(Math.abs(fl.place.r), 90);
  assert.ok(Math.abs(fl.place.y + 72 * fl.place.s - floor) < 2, "lying on the floor after the fall");
});

test("walking: the leg phase follows the distance walked and the stride the speed (no skating at the start and end)", () => {
  const { film } = direct({ secs: 5, place: "park", cast: [{ id: "a", at: 0.1 }], actions: [{ at: 0.2, who: "a", do: "walk", to: 0.6 }] });
  const [[p, i]] = people(film.layers);
  const keys = (p.x as { keys: [number, number][] }).keys;
  const [f0, f1] = [keys[1][0], keys[keys.length - 1][0]];
  const mid = Math.round((f0 + f1) / 2);
  const a = personState(p, i, mid), b = personState(p, i, mid + 4);
  assert.ok(a.pose.stride > 15, `striding mid-walk (${a.pose.stride.toFixed(1)})`);
  assert.ok(b.pose.phase! > a.pose.phase!, "the phase advances with the distance");
  const start = personState(p, i, f0 + 1);
  assert.ok(start.pose.stride < a.pose.stride * 0.5, `small first steps (${start.pose.stride.toFixed(1)})`);
  assert.equal(personState(p, i, f1 + 30).pose.stride, 0, "standing still after arriving");
});

test("no pops: every example shot moves without a single-frame jump (hands, heads, carried things, faces, mirror flips)", async () => {
  const fs = await import("fs");
  const { smoothness } = await import("../src/stickman/film/lint");
  const { ShotSchema } = await import("../src/stickman/film/direct");
  for (const name of ["director-test", "faces-test", "avatars-test", "one-minute-a-day", "walk-test", "turn-test"]) {
    const j = JSON.parse(fs.readFileSync(`scripts/film/examples/${name}.json`, "utf8"));
    (Array.isArray(j) ? j : j.shots).forEach((raw: unknown, i: number) => {
      const shot = ShotSchema.parse(raw);
      const pops = smoothness(direct(shot).film, Math.round(shot.secs * 30));
      assert.deepEqual(pops.map((p) => `${p.frame}: ${p.detail}`), [], `${name} shot ${i}`);
    });
  }
});

test("camera feel: an impact kick dies away to exactly rest; the follow spring never overshoots", async () => {
  const { shakeAt, damp } = await import("../src/stickman/film/camfx");
  const kick = [{ kind: "impact" as const, at: 10, dur: 20 }];
  assert.ok(Math.abs(shakeAt(kick, 12).y) > 1, "it kicks");
  const end = shakeAt(kick, 29.9);
  assert.ok(Math.abs(end.x) < 0.05 && Math.abs(end.y) < 0.05 && Math.abs(end.r) < 0.01, "back at rest by the end");
  assert.deepEqual(shakeAt(kick, 40), { x: 0, y: 0, r: 0, z: 1 });
  let x = 0, v = 0, max = 0;
  for (let f = 0; f < 200; f++) { [x, v] = damp(x, v, 100, 16); max = Math.max(max, x); }
  assert.ok(max <= 100.0001 && x > 99.9, `glides to the target without overshoot (max ${max.toFixed(3)})`);
});

test("timing curves: cruise, fall and rise run from 0 to 1 and never go backwards", async () => {
  const { easeFn } = await import("../src/stickman/film/anim");
  for (const e of ["cruise", "fall", "rise"] as const) {
    let prev = -1;
    for (let i = 0; i <= 100; i++) { const v = easeFn(e, i / 100); assert.ok(v >= prev - 1e-9, `${e} monotonic at ${i}`); prev = v; }
    assert.ok(Math.abs(easeFn(e, 0)) < 1e-9 && Math.abs(easeFn(e, 1) - 1) < 1e-9, `${e} endpoints`);
  }
  // cruise holds an even pace through the middle
  const mid = (easeFn("cruise", 0.6) - easeFn("cruise", 0.4)) / 0.2;
  assert.ok(Math.abs(mid - 1 / (1 - 0.18)) < 1e-6, "steady middle speed");
});

test("hair covers the crown at every turn of the head (no bald top above a band of hair)", async () => {
  const { hairCap } = await import("../src/stickman/film/person");
  const inside = (poly: [number, number][], x: number, y: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let T = 0; T <= 1.0001; T += 0.05) {
    for (const dip of [0.42, 0.55, 0.62]) {
      const cap = hairCap(T, dip), cx = -5 * T, cy = -68;
      // the very top of the skull and a little either side of it
      for (const dx of [-20, 0, 20]) assert.ok(inside(cap, cx + dx, cy - 52), `crown covered at T=${T.toFixed(2)} dip=${dip} dx=${dx}`);
    }
  }
});
