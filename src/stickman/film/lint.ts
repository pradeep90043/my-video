/**
 * Smoothness check for a compiled film shot: follows every person's head and front hand, and every carried prop, frame by frame,
 * and reports POPS: a point that jumps much further in one frame than in the frame before and the frame after (a snap, a
 * teleport, a mirror flip). Real fast motion ramps up and down, so it is not a pop; an isolated spike is. Also reports a face that snaps
 * round and a facing flip that happens while the face is side-on (where the mirror shows).
 */
import { PROPS } from "./props";
import { BODY, carryPoint, frontHandWorld, personState, toWorld, type PersonState } from "./rig";
import { val } from "./anim";
import type { FilmLayer, FilmSpec } from "./schema";

export interface Pop { frame: number; layer: number; part: string; detail: string }

type Person = Extract<FilmLayer, { t: "person" }>;
type Prop = Extract<FilmLayer, { t: "prop" }>;

const rot = (x: number, y: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
};
/** the middle of the head, world space */
function headWorld(st: PersonState): [number, number] {
  const [x, y] = rot(0, -252, st.pose.lean);
  return toWorld(st.place, x, y - BODY.hip);
}

/** Spikes in a per-frame track of points: one-frame moves far beyond the local typical move. */
function spikes(track: ([number, number] | undefined)[], minJump: number[]): number[] {
  const v = track.map((p, f) => (p && track[f - 1] ? Math.hypot(p[0] - track[f - 1]![0], p[1] - track[f - 1]![1]) : 0));
  const out: number[] = [];
  for (let f = 1; f < v.length; f++) {
    if (v[f] < minJump[f]) continue;
    // a pop is isolated: far bigger than the move just before AND just after (real motion speeds up and slows down)
    if (v[f] > 2.5 * Math.max(v[f - 1] ?? 0, v[f + 1] ?? 0) + 1) out.push(f);
  }
  return out;
}

export function smoothness(film: FilmSpec, frames: number): Pop[] {
  const pops: Pop[] = [];
  const states = new Map<number, PersonState[]>();
  film.layers.forEach((l, i) => {
    if (l.t !== "person") return;
    const st: PersonState[] = [];
    for (let f = 0; f < frames; f++) st.push(personState(l as Person, i, f));
    states.set(i, st);
    const min = st.map((s) => 30 * s.place.s);
    // the mirror in the middle of a turn swaps which hand is "front"; with the arms hanging symmetrically that shows nothing
    const symmetricFlip = (f: number) => st[f].place.flip !== st[f - 1]?.place.flip && (st[f].pose.spread ?? 0) > 0.9;
    for (const [part, pick] of [["head", headWorld], ["hand", (s: PersonState, f: number) => frontHandWorld(s, f)]] as const) {
      for (const f of spikes(st.map((s, f) => pick(s, f)), min)) if (!symmetricFlip(f)) pops.push({ frame: f, layer: i, part, detail: `${part} jumps in one frame` });
    }
    for (let f = 1; f < frames; f++) {
      const dT = Math.abs((st[f].pose.turn ?? 0.75) - (st[f - 1].pose.turn ?? 0.75));
      if (dT > 0.25) pops.push({ frame: f, layer: i, part: "face", detail: `face turns ${dT.toFixed(2)} in one frame` });
      if (st[f].place.flip !== st[f - 1].place.flip && (st[f].pose.turn ?? 0.75) > 0.3) pops.push({ frame: f, layer: i, part: "body", detail: "mirror flip while side-on" });
    }
  });
  // carried props ride the hand, then are put down: the hand-off must not jump
  film.layers.forEach((l, i) => {
    if (l.t !== "prop" || !(l as Prop).held?.length) return;
    const p = l as Prop;
    const track: ([number, number] | undefined)[] = [], min: number[] = [];
    for (let f = 0; f < frames; f++) {
      const h = p.held!.find((h) => f >= h.from && (h.until === undefined || f < h.until));
      const s = val(p.s, f, 1);
      min.push(30 * s);
      const carrier = h && states.get(h.by)?.[f];
      if (carrier) {
        const [hx, hy] = carryPoint(carrier, f);
        const g = h!.grip ?? PROPS[p.kind].grip ?? [0, -PROPS[p.kind].h / 2];
        const fl = p.flip ? -1 : 1;
        track.push([hx - g[0] * s * fl, hy - g[1] * s]);
      } else track.push([val(p.x, f, 960), val(p.y, f, 540)]);
    }
    for (const f of spikes(track, min)) pops.push({ frame: f, layer: i, part: `prop ${p.kind}`, detail: "carried thing jumps in one frame" });
  });
  return pops.sort((a, b) => a.frame - b.frame);
}
