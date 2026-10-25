/**
 * The director: turns a shot described in WORDS (a place, who is in it, what is where, what they do, how the camera sees it)
 * into exact film layers. Nobody writes a coordinate. A cup "on" the desk stands on the desk's top; a person who "sits on" the chair
 * has the hip on the seat and the feet on the floor; "pick" walks close enough, bends the arm onto the thing (inverse kinematics) and
 * the thing then rides in the hand; the camera frames what it is told to look at and never shows past the set. Sounds come with
 * the actions. This is what an LLM writes (see scripts/film/plan-film.ts); `direct()` is pure and deterministic.
 */
import { z } from "zod";
import type { FilmLayer, FilmSpec } from "./schema";
import { FilmSchema, MOODS, PERSON_POSES, PROP_KINDS, WHO } from "./schema";
import { PROPS, type PropKind } from "./props";
import { BODY, REACH } from "./rig";
import { PARK_GROUND, ROOM_FLOOR } from "./env";

const FPS = 30, W = 1920, H = 1080;

// ───────────────────────────── the vocabulary ─────────────────────────────

export const PLACE_NAMES = ["bedroom", "study", "kitchen", "classroom", "office", "living-room", "room", "shop", "park", "street", "desk-closeup", "black", "paper"] as const;
export const ACTIONS = ["walk", "run", "enter", "exit", "sit", "stand", "lie", "sleep", "wake", "pick", "put", "give", "use", "write", "press", "look", "face", "pose", "mood", "say", "think", "switch"] as const;
export const SHOT_SIZES = ["wide", "full", "medium", "close", "detail"] as const;
export const MOVES = ["static", "push-in", "pull-out", "pan-left", "pan-right", "follow"] as const;

const Pos = z.number().min(0).max(1);
const PropSpecSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(PROP_KINDS),
  /** "floor" / "wall", or the id of the prop (or built-in surface: "counter", "desk") it stands on */
  on: z.string().optional(),
  /** 0 = left edge of the screen (or of the surface it is on), 1 = right */
  at: Pos.optional(),
  row: z.enum(["back", "mid", "front"]).optional(),
  /** wall props: 0 = floor line, 1 = ceiling */
  height: Pos.optional(),
  label: z.string().max(40).optional(), color: z.string().optional(), lit: z.boolean().optional(), flip: z.boolean().optional(),
  size: z.number().min(0.3).max(3).optional(),
});
const CastSchema = z.object({
  id: z.string().min(1),
  who: z.enum(WHO).default("student"),
  shirt: z.string().optional(),
  at: Pos.optional(),
  row: z.enum(["back", "mid", "front"]).optional(),
  facing: z.enum(["left", "right"]).optional(),
  pose: z.enum(PERSON_POSES).optional(),
  mood: z.enum(MOODS).default("neutral"),
  /** starts seated on / lying on this prop */
  sitOn: z.string().optional(), lieOn: z.string().optional(),
  /** starts holding this prop */
  holds: z.string().optional(),
  /** walks in from off-screen at the start */
  enter: z.enum(["left", "right"]).optional(),
});
const ActionSchema = z.object({
  at: z.number().min(0),
  who: z.string(),
  do: z.enum(ACTIONS),
  /** a prop or cast id (sit on, pick, put on, give to, look at, use, write on, press, walk to) */
  target: z.string().optional(),
  /** walk to: 0..1 across the screen, or "left" / "right" for off-screen */
  to: z.union([Pos, z.enum(["left", "right"])]).optional(),
  /** where on the target surface something is put, 0..1 */
  spot: Pos.optional(),
  pose: z.enum(PERSON_POSES).optional(),
  mood: z.enum(MOODS).optional(),
  text: z.string().max(80).optional(),
  dur: z.number().min(0.2).max(20).optional(),
});
export const ShotSchema = z.object({
  secs: z.number().min(0.5).max(30),
  place: z.enum(PLACE_NAMES),
  time: z.enum(["day", "dusk", "night", "rain"]).default("day"),
  wall: z.string().optional(), floor: z.enum(["wood", "tile", "carpet", "concrete"]).optional(),
  /** the place's own furniture (bed in a bedroom, desk + chair in a study...) */
  furnish: z.boolean().default(true),
  props: z.array(PropSpecSchema).max(24).default([]),
  cast: z.array(CastSchema).max(5).default([]),
  actions: z.array(ActionSchema).max(40).default([]),
  camera: z.object({
    shot: z.enum(SHOT_SIZES).default("wide"),
    on: z.union([z.string(), z.array(z.string())]).optional(),
    move: z.enum(MOVES).default("static"),
  }).default({ shot: "wide", move: "static" }),
  captions: z.array(z.object({ text: z.string().max(80), at: z.number().min(0).default(0), dur: z.number().optional(), style: z.enum(["speech", "excuse", "title", "whisper"]).default("speech") })).default([]),
  title: z.string().max(40).optional(),
  fx: z.array(z.enum(["rain", "dust", "leaves", "sunrays", "glow"])).default([]),
  fadeIn: z.number().min(0).max(3).default(0), fadeOut: z.number().min(0).max(3).default(0),
});
export type ShotInput = z.input<typeof ShotSchema>;
export type Shot = z.infer<typeof ShotSchema>;
type PropIn = z.infer<typeof PropSpecSchema>;
type CastIn = z.infer<typeof CastSchema>;

// ───────────────────────────── places ─────────────────────────────

type RowName = "back" | "mid" | "front";
interface Row { y: number; s: number; z: number }
interface Place {
  env: FilmLayer & { t: "env" } | null;
  rows: Record<RowName, Row>;
  /** a built-in surface drawn by the environment itself */
  surfaces?: Record<string, { y: number; x0: number; x1: number; s: number; z: number }>;
  /** person rows that sit behind a built-in surface use a legless seated pose */
  behind?: RowName;
  wallTop?: number; wallBottom?: number; wallS?: number;
  furniture: PropIn[];
  floorSound: string;
}

const ROOM_ROWS: Record<RowName, Row> = { back: { y: ROOM_FLOOR + 80, s: 0.8, z: 10 }, mid: { y: ROOM_FLOOR + 220, s: 0.95, z: 30 }, front: { y: ROOM_FLOOR + 360, s: 1.12, z: 50 } };
const env = (kind: string, grade: string, extra: object = {}) => ({ t: "env", kind, grade, depth: 1, blur: 0, at: 0, ...extra }) as unknown as FilmLayer & { t: "env" };
const grade = (t: string) => (t === "dusk" ? "day" : t);

function placeOf(shot: Shot): Place {
  const g = grade(shot.time);
  const room = (furniture: PropIn[], wall?: string, floor?: string): Place => ({
    env: env("room", g, { wall: shot.wall ?? wall, floor: shot.floor ?? floor }), rows: ROOM_ROWS, wallTop: 40, wallBottom: ROOM_FLOOR - 20, wallS: 0.8,
    furniture, floorSound: (shot.floor ?? floor) === "carpet" ? "footsteps-carpet" : "footsteps-wood",
  });
  switch (shot.place) {
    case "bedroom": return room([
      { id: "window", kind: "window", on: "wall", at: 0.2, height: 0.55 }, { id: "bed", kind: "bed", on: "floor", at: 0.62, row: "back" },
      { id: "pillow", kind: "pillow", on: "bed", at: 0.08 }, { id: "lamp", kind: "lamp-desk", on: "nightstand", at: 0.75 },
      { id: "nightstand", kind: "nightstand", on: "floor", at: 0.92, row: "back" }, { id: "clock", kind: "clock", on: "wall", at: 0.86, height: 0.75 },
    ], "#b9c6d6", "carpet");
    case "study": return room([
      { id: "window", kind: "window", on: "wall", at: 0.3, height: 0.55 }, { id: "desk", kind: "desk", on: "floor", at: 0.42, row: "back" },
      { id: "chair", kind: "chair", on: "floor", at: 0.27, row: "back" }, { id: "lamp", kind: "lamp-desk", on: "desk", at: 0.85 },
      { id: "bookcase", kind: "bookcase", on: "floor", at: 0.85, row: "back" }, { id: "clock", kind: "clock", on: "wall", at: 0.62, height: 0.8 },
    ], "#c7cbbf");
    case "kitchen": return room([
      { id: "window", kind: "window", on: "wall", at: 0.4, height: 0.7 }, { id: "counter", kind: "kitchen-counter", on: "floor", at: 0.38, row: "back" },
      { id: "stove", kind: "stove", on: "floor", at: 0.6, row: "back" }, { id: "fridge", kind: "fridge", on: "floor", at: 0.82, row: "back" },
    ], "#d8d2c4", "tile");
    case "classroom": return room([
      { id: "board", kind: "whiteboard", on: "wall", at: 0.55, height: 0.62 }, { id: "desk", kind: "desk", on: "floor", at: 0.2, row: "back" },
      { id: "clock", kind: "clock", on: "wall", at: 0.9, height: 0.8 },
    ], "#cfd8c8");
    case "office": return room([
      { id: "window", kind: "window", on: "wall", at: 0.75, height: 0.55 }, { id: "desk", kind: "desk", on: "floor", at: 0.42, row: "back" },
      { id: "chair", kind: "chair", on: "floor", at: 0.27, row: "back" }, { id: "laptop", kind: "laptop", on: "desk", at: 0.35 },
      { id: "plant", kind: "plant", on: "floor", at: 0.92, row: "back" },
    ], "#d3d6da", "carpet");
    case "living-room": return room([
      { id: "window", kind: "window", on: "wall", at: 0.22, height: 0.55 }, { id: "sofa", kind: "sofa", on: "floor", at: 0.42, row: "back" },
      { id: "lamp", kind: "lamp-floor", on: "floor", at: 0.64, row: "back" }, { id: "tv-stand", kind: "tv-stand", on: "floor", at: 0.86, row: "back" },
      { id: "tv", kind: "tv", on: "tv-stand", at: 0.5 },
    ], "#c9bfb3");
    case "room": return room([]);
    case "shop": return {
      env: env("shop-counter", g), rows: { back: { y: 960, s: 1.0, z: 10 }, mid: { y: 960, s: 1.0, z: 10 }, front: { y: 1110, s: 1.35, z: 50 } },
      surfaces: { counter: { y: 700, x0: 520, x1: 1900, s: 1.0, z: 17 } }, behind: undefined, furniture: [], floorSound: "footsteps-wood",
    };
    case "park": return {
      env: env("park", g), rows: { back: { y: PARK_GROUND + 70, s: 0.6, z: 10 }, mid: { y: PARK_GROUND + 230, s: 0.8, z: 30 }, front: { y: PARK_GROUND + 400, s: 1.0, z: 50 } },
      furniture: [{ id: "bench", kind: "bench", on: "floor", at: 0.55, row: "mid" }, { id: "bin", kind: "trash-bin", on: "floor", at: 0.85, row: "mid" }],
      floorSound: "footsteps-grass",
    };
    case "street": return {
      env: env("street-view", g), rows: { back: { y: 930, s: 0.6, z: 10 }, mid: { y: 1010, s: 0.8, z: 30 }, front: { y: 1090, s: 1.0, z: 50 } },
      furniture: [], floorSound: "footsteps",
    };
    case "desk-closeup": return {
      env: env(shot.time === "night" ? "desk-night" : "desk-dawn", g), rows: { back: { y: 1000, s: 1.3, z: 10 }, mid: { y: 1000, s: 1.3, z: 10 }, front: { y: 1000, s: 1.3, z: 10 } },
      surfaces: { desk: { y: 700, x0: 0, x1: W, s: 1.3, z: 17 } }, behind: "back", furniture: [], floorSound: "footsteps-wood",
    };
    case "paper": return { env: env("paper", g), rows: ROOM_ROWS, furniture: [], floorSound: "footsteps" };
    default: return { env: env("black", g), rows: ROOM_ROWS, furniture: [], floorSound: "footsteps" };
  }
}

// ───────────────────────────── the compiler ─────────────────────────────

interface PropState {
  spec: PropIn; kind: PropKind; layerIndex: number;
  x: number; y: number; s: number; z: number; flip: boolean;
  /** what it stands on (for children and for "put") */
  support: string; row: RowName | "wall" | "builtin";
  xs: [number, number][]; ys: [number, number][]; ss: [number, number][]; zs: [number, number][];
  held: { from: number; until?: number; by: number }[];
  ons: [number, boolean][];
  holder?: string;
}
interface CastState {
  spec: CastIn; layerIndex: number;
  x: number; y: number; s: number; r: number; row: RowName; flip: boolean; z: number;
  pose: string; seated?: string; lying?: string; holding?: string;
  xs: [number, number][]; ys: [number, number][]; ss: [number, number][]; rs: [number, number][]; zs: [number, number][];
  poses: [number, string][]; faces: [number, boolean][]; moods: [number, string][]; looks: [number, number][];
  reach: { at: number; dur: number; x: number; y: number; hold?: boolean; release?: number; ease?: number; wiggle?: number }[];
  /** where the head looks (and the face turns): gaze targets, turns to the camera, speaking */
  gazes: { at: number; until?: number; x: number; y: number }[]; turns: [number, number][]; talks: [number, number][]; toCamera?: boolean;
  /** the frame this person is free again (actions queue up behind each other) */
  busy: number;
  initPose: string; initFlip: boolean; initZ: number;
}

export interface Directed { film: FilmSpec; warnings: string[] }

const WALK_SPEED = 18, RUN_SPEED = 27; // px per frame at scale 1: matched to the stride so the feet do not slide
const surfaceFrac = (at: number | undefined, i: number, n: number) => at ?? (n === 1 ? 0.5 : 0.15 + (0.7 * i) / (n - 1));

export function direct(input: ShotInput | Shot, opts: { fps?: number } = {}): Directed {
  const fps = opts.fps ?? FPS;
  const shot = ShotSchema.parse(input);
  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);
  const F = (sec: number) => Math.round(sec * fps);
  const total = F(shot.secs);
  const place = placeOf(shot);
  const layers: FilmLayer[] = [];
  const foley: { name: string; at: number; volume?: number; seconds?: number }[] = [];

  const late: FilmLayer[] = []; // captions: after the bodies, so the layer indexes of props and people are known up front
  if (place.env) layers.push(place.env);
  if (shot.title || shot.place === "black") {
    // a title card: just words
    if (shot.title) layers.push({ t: "caption", style: "title", text: shot.title, at: 6, x: 960, y: 570, big: true } as FilmLayer);
  }

  // ── props: furniture first, then what stands on it ──
  const specs: PropIn[] = [...(shot.furnish ? place.furniture.filter((f) => !shot.props.some((p) => p.id === f.id)) : []), ...shot.props];
  const props = new Map<string, PropState>();
  const placed = new Set<string>();
  const byId = new Map(specs.map((p) => [p.id, p]));
  const rowOf = (p: PropIn): RowName => p.row ?? (PROPS[p.kind].big ? "back" : "mid");

  const placeProp = (p: PropIn, depth = 0): PropState | undefined => {
    if (props.has(p.id)) return props.get(p.id);
    if (depth > 4) { warn(`${p.id}: support chain too deep`); return undefined; }
    const sp = PROPS[p.kind];
    const size = p.size ?? 1;
    let on = p.on ?? (sp.mount === "wall" ? "wall" : sp.mount === "floor" ? "floor" : undefined);
    if (on === undefined) {
      // a small thing with no support named goes on the first table-like thing, else on the floor
      const host = specs.find((q) => q.id !== p.id && PROPS[q.kind].top && PROPS[q.kind].big);
      on = host?.id ?? (place.surfaces ? Object.keys(place.surfaces)[0] : "floor");
    }
    let st: PropState;
    const base = { spec: p, kind: p.kind, layerIndex: -1, flip: p.flip ?? false, xs: [], ys: [], ss: [], zs: [], held: [], ons: [] } as unknown as PropState;
    if (on === "wall") {
      const s = (place.wallS ?? 0.8) * size;
      const top = place.wallTop ?? 40, bottom = place.wallBottom ?? 650;
      const hgt = p.height ?? 0.55;
      const cy = bottom - (bottom - top) * hgt;
      st = { ...base, x: 120 + (p.at ?? 0.5) * (W - 240), y: Math.min(bottom, cy + (sp.h * s) / 2), s, z: 4, support: "wall", row: "wall" };
    } else if (on === "floor") {
      const row = place.rows[rowOf(p)];
      const s = row.s * size;
      st = { ...base, x: 100 + (p.at ?? 0.5) * (W - 200), y: row.y, s, z: row.z + (["desk", "table", "kitchen-counter", "stove"].includes(p.kind) ? 3 : 0), support: "floor", row: rowOf(p) };
    } else if (place.surfaces?.[on]) {
      const sf = place.surfaces[on];
      const sibs = specs.filter((q) => q.on === on);
      const i = sibs.indexOf(p);
      st = { ...base, x: sf.x0 + 60 + surfaceFrac(p.at, i, sibs.length) * (sf.x1 - sf.x0 - 120), y: sf.y, s: sf.s * size, z: sf.z, support: on, row: "builtin" };
    } else {
      const hostSpec = byId.get(on);
      const host = hostSpec ? placeProp(hostSpec, depth + 1) : undefined;
      const top = host ? PROPS[host.kind].top : undefined;
      if (!host || !top) {
        warn(`${p.id}: "${on}" is not something things can stand on — put on the floor`);
        return placeProp({ ...p, on: "floor" }, depth + 1);
      }
      const sibs = specs.filter((q) => q.on === on);
      const i = sibs.indexOf(p);
      const f = surfaceFrac(p.at, i, sibs.length);
      const w = top.w * host.s;
      st = { ...base, x: host.x - w / 2 + 30 * host.s + f * (w - 60 * host.s), y: host.y - top.y * host.s, s: host.s * size, z: host.z + 1 + (host.row === "wall" ? 0 : 1), support: on, row: host.row };
    }
    props.set(p.id, st);
    placed.add(p.id);
    return st;
  };
  for (const p of specs) placeProp(p);
  [...props.values()].forEach((p, i) => { p.layerIndex = layers.length + i; });

  // furniture on one row must not overlap: nudge right (then left) until it is free
  const floorProps = [...props.values()].filter((p) => p.support === "floor" || p.support === "wall");
  for (let i = 0; i < floorProps.length; i++) {
    const a = floorProps[i];
    for (let tries = 0; tries < 12; tries++) {
      const hit = floorProps.slice(0, i).find((b) => b.row === a.row && Math.abs(a.x - b.x) < (PROPS[a.kind].w * a.s + PROPS[b.kind].w * b.s) / 2 + 10 &&
        (a.row !== "wall" || Math.abs(a.y - b.y) < (PROPS[a.kind].h * a.s + PROPS[b.kind].h * b.s) / 2));
      if (!hit) break;
      if (a.spec.kind === "chair" && byId.get(hit.spec.id)?.kind === "desk") break; // a chair belongs at its desk (handled below)
      const dir = a.x >= hit.x ? 1 : -1;
      a.x = hit.x + dir * ((PROPS[a.kind].w * a.s + PROPS[hit.kind].w * hit.s) / 2 + 14);
    }
    const half = (PROPS[a.kind].w * a.s) / 2;
    a.x = Math.max(half - 40, Math.min(W - half + 40, a.x));
  }
  // things on top move with what they stand on
  const settle = (p: PropState) => {
    const host = props.get(p.support);
    if (!host) return;
    settle(host);
    const top = PROPS[host.kind].top!;
    const sibs = specs.filter((q) => q.on === p.support);
    const f = surfaceFrac(p.spec.at, sibs.indexOf(p.spec), sibs.length);
    const w = top.w * host.s;
    p.x = host.x - w / 2 + 30 * host.s + f * (w - 60 * host.s);
    p.y = host.y - top.y * host.s;
  };
  // a chair at a desk: tucked under the desk's left edge, facing it
  for (const ch of props.values()) {
    if (ch.kind !== "chair" || ch.support !== "floor") continue;
    const desk = [...props.values()].find((d) => (d.kind === "desk" || d.kind === "table") && d.row === ch.row && Math.abs(d.x - ch.x) < (PROPS[d.kind].w * d.s) / 2 + 260 * d.s);
    if (!desk) continue;
    const left = ch.x <= desk.x;
    ch.flip = !left;
    ch.x = desk.x + (left ? -1 : 1) * ((PROPS[desk.kind].w * desk.s) / 2 - 10 * desk.s);
  }
  for (const p of props.values()) settle(p);
  const hosts = new Set([...props.values()].map((p) => p.support));
  for (const h of hosts) {
    const kids = [...props.values()].filter((p) => p.support === h).sort((a, b) => a.x - b.x);
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1], b = kids[i];
      const gap = (PROPS[a.kind].w * a.s + PROPS[b.kind].w * b.s) / 2 + 8 * b.s;
      if (b.x - a.x < gap) b.x = a.x + gap;
    }
    const host = props.get(h);
    if (host && kids.length) {
      // pushed past the far edge: slide the whole row back onto the surface
      const top = PROPS[host.kind].top!, right = host.x + (top.w * host.s) / 2;
      const left = host.x - (top.w * host.s) / 2;
      const need = kids.reduce((n, k) => n + PROPS[k.kind].w * k.s, 0);
      if (need > top.w * host.s * 1.05) warn(`${h}: not enough room for ${kids.map((k) => k.spec.id).join(", ")}`);
      const last = kids[kids.length - 1], over = last.x + (PROPS[last.kind].w * last.s) / 2 - right;
      if (over > 0) for (const k of kids) k.x -= over;
      const under = left - (kids[0].x - (PROPS[kids[0].kind].w * kids[0].s) / 2);
      if (under > 0 && need <= top.w * host.s) for (const k of kids) k.x += under;
    }
  }

  // ── cast ──
  const cast = new Map<string, CastState>();
  const n = shot.cast.length;
  shot.cast.forEach((c, i) => {
    const rowName: RowName = c.row ?? (place.behind ?? "mid");
    const row = place.rows[rowName];
    const at = c.at ?? (n === 1 ? 0.5 : 0.28 + (0.44 * i) / Math.max(1, n - 1));
    const x = 100 + at * (W - 200);
    const pose = c.pose ?? (place.behind === rowName ? "sit" : "stand");
    const st: CastState = {
      spec: c, layerIndex: -1, x, y: row.y, s: row.s, r: 0, row: rowName, flip: c.facing ? c.facing === "left" : x > W / 2 && n > 1, z: row.z + 2,
      pose, xs: [], ys: [], ss: [], rs: [], zs: [], poses: [], faces: [], moods: [], looks: [], reach: [], gazes: [], turns: [], talks: [], busy: 0,
      initPose: pose, initFlip: false, initZ: 0,
    };
    st.layerIndex = layers.length + props.size + i;
    cast.set(c.id, st);
  });

  // where things are in the world
  const propGrip = (p: PropState): [number, number] => {
    const g = PROPS[p.kind].grip ?? [0, -PROPS[p.kind].h / 2];
    return [p.x + g[0] * p.s * (p.flip ? -1 : 1), p.y + g[1] * p.s];
  };
  const shoulder = (c: CastState): [number, number] => [c.x + (c.flip ? -1 : 1) * 50 * c.s, c.y - (BODY.hip + 148) * c.s];
  const near = (c: CastState, wx: number, wy: number) => Math.hypot(wx - shoulder(c)[0], wy - shoulder(c)[1]) < REACH * c.s * 0.92;

  const setFace = (c: CastState, f: number, left: boolean) => { if (c.flip !== left) { c.flip = left; c.faces.push([f, left]); } };
  const setPose = (c: CastState, f: number, pose: string) => { if (c.pose !== pose) { c.pose = pose; c.poses.push([f, pose]); } };
  /** a head (world point) to look at */
  const headOf = (c: CastState): [number, number] => [c.x, c.y - (c.lying ? 60 : BODY.head) * c.s];
  /** look at a point until something else takes the attention */
  const gaze = (c: CastState, f: number, x: number, y: number, until?: number) => { endGaze(c, f); c.gazes.push({ at: f, x, y, until }); };
  const endGaze = (c: CastState, f: number) => {
    for (const g of c.gazes) if (g.until === undefined || g.until > f) g.until = Math.max(g.at + 1, f);
    if (c.toCamera) { c.turns.push([f, -1]); c.toCamera = undefined; }
  };
  const key = (arr: [number, number][], f: number, from: number, to: number, dur: number) => {
    if (from === to) return;
    arr.push([f, from], [f + Math.max(1, dur), to]);
  };
  const setRow = (c: CastState, f: number, rowName: RowName, dur: number) => {
    const row = place.rows[rowName];
    if (rowName === c.row) return;
    key(c.ss, f, c.s, row.s, dur);
    c.s = row.s;
    c.zs.push([f + Math.round(dur / 2), row.z + 2]);
    c.z = row.z + 2;
    c.row = rowName;
  };
  /** walk (or run) to a world x on a row; returns the arrival frame */
  const walkTo = (c: CastState, f: number, tx: number, rowName: RowName = c.row, run = false): number => {
    const row = place.rows[rowName];
    if (Math.abs(tx - c.x) < 6 && rowName === c.row) return f;
    f = standUp(c, f);
    const dist = Math.hypot(tx - c.x, (row.y - c.y) * 1.6);
    const dur = Math.max(10, Math.round(dist / ((run ? RUN_SPEED : WALK_SPEED) * ((c.s + row.s) / 2))));
    setFace(c, f, tx < c.x);
    const before = c.pose === "walk" || c.pose === "run" ? "stand" : c.pose;
    setPose(c, f, run ? "run" : "walk");
    key(c.xs, f, c.x, tx, dur);
    key(c.ys, f, c.y, row.y, dur);
    setRow(c, f, rowName, dur);
    c.x = tx; c.y = row.y;
    foley.push({ name: run ? "run" : place.floorSound, at: f, seconds: Math.min(dur / fps, 6), volume: run ? 0.5 : 0.45 });
    setPose(c, f + dur, before === "walk" || before === "run" ? "stand" : before);
    return f + dur;
  };
  /** a seated / lying person gets up first */
  const standUp = (c: CastState, f: number): number => {
    if (!c.seated && !c.lying) return f;
    const row = place.rows[c.row];
    if (c.lying) { key(c.rs, f, c.r, 0, 16); c.r = 0; }
    for (const r of c.reach) if (r.hold && r.release === undefined) r.release = f;
    key(c.ys, f, c.y, row.y, 14);
    c.y = row.y;
    c.seated = undefined; c.lying = undefined;
    setPose(c, f, "stand");
    foley.push({ name: "cloth", at: f, volume: 0.35 });
    return f + 16;
  };
  /** step beside a prop so the arm reaches it; returns the arrival frame */
  const approach = (c: CastState, f: number, wx: number, wy: number, propRow: RowName | "wall" | "builtin"): number => {
    if (near(c, wx, wy) && (propRow === c.row || propRow === "builtin" || propRow === "wall")) {
      setFace(c, f, wx < c.x);
      return f;
    }
    const rowName: RowName = propRow === "back" || propRow === "mid" || propRow === "front" ? propRow : c.row;
    const s = place.rows[rowName].s;
    const side = c.x <= wx ? -1 : 1;
    const tx = Math.max(60, Math.min(W - 60, wx + side * 190 * s));
    const arrive = walkTo(c, f, tx, rowName);
    setFace(c, arrive, wx < tx);
    return arrive;
  };

  const actions = [...shot.actions].sort((a, b) => a.at - b.at);

  // initial states that need props (sitting, lying, holding, entering)
  for (const c of cast.values()) {
    const spec = c.spec;
    if (spec.sitOn) sitOn(c, 0, spec.sitOn, true);
    if (spec.lieOn) lieOn(c, 0, spec.lieOn, true);
    if (spec.holds) {
      const p = props.get(spec.holds);
      if (p) { p.held.push({ from: 0, by: c.layerIndex }); p.holder = spec.id; c.holding = p.spec.id; if (!c.lying) c.pose = c.seated ? "sit-hold" : "hold"; }
      else warn(`${spec.id} holds "${spec.holds}", which is not in the shot`);
    }
    c.initPose = c.pose;
    if (spec.enter) {
      c.x = spec.enter === "left" ? -180 : W + 180;
      c.flip = spec.enter === "right";
    }
    c.initFlip = c.flip; c.initZ = c.z;
    if (spec.enter) c.busy = walkTo(c, 0, 100 + (spec.at ?? 0.5) * (W - 200));
  }

  function sitOn(c: CastState, f: number, id: string, initial = false): number {
    const p = props.get(id);
    const seat = p && PROPS[p.kind].seat;
    if (!p || !seat) { warn(`${c.spec.id} cannot sit on "${id}"`); return f; }
    const left = p.kind === "chair" ? p.flip : c.flip;
    const hipX = p.x + (left ? -1 : 1) * (seat.dx - 40) * p.s;
    const seatTop = p.y - seat.y * p.s;
    const rowName = (p.row === "back" || p.row === "mid" || p.row === "front" ? p.row : c.row) as RowName;
    if (initial) {
      c.x = hipX; c.s = p.s; c.row = rowName; c.z = place.rows[rowName].z + 2; c.flip = left;
      c.y = seatTop - 28 * c.s + BODY.hip * c.s; c.pose = "sit-chair"; c.seated = id;
      return f;
    }
    let t = walkTo(c, f, hipX + (left ? 1 : -1) * 0 , rowName);
    setFace(c, t, left);
    const y = seatTop - 28 * c.s + BODY.hip * c.s;
    key(c.ys, t, c.y, y, 14);
    c.y = y;
    setPose(c, t, "sit-chair");
    c.seated = id;
    foley.push({ name: "cloth", at: t + 4, volume: 0.35 });
    if (p.kind === "chair" || p.kind === "stool") foley.push({ name: "thud", at: t + 12, volume: 0.18 });
    t += 16;
    return t;
  }
  function lieOn(c: CastState, f: number, id: string, initial = false): number {
    const p = props.get(id);
    const seat = p && PROPS[p.kind].seat;
    if (!p || !seat) { warn(`${c.spec.id} cannot lie on "${id}"`); return f; }
    const top = p.y - (PROPS[p.kind].top?.y ?? seat.y) * p.s;
    const fx = p.x + 210 * p.s * (p.flip ? -1 : 1);
    const y = top - 70 * p.s;
    const rowName = (p.row === "back" || p.row === "mid" || p.row === "front" ? p.row : c.row) as RowName;
    if (initial) {
      c.x = fx; c.y = y; c.s = p.s; c.row = rowName; c.z = place.rows[rowName].z + 2; c.r = p.flip ? 90 : -90; c.flip = !!p.flip; c.pose = "lie"; c.lying = id;
      return f;
    }
    let t = walkTo(c, f, p.x + (PROPS[p.kind].w / 2 - 60) * p.s, rowName);
    setPose(c, t, "lie");
    key(c.xs, t, c.x, fx, 18); c.x = fx;
    key(c.ys, t, c.y, y, 18); c.y = y;
    key(c.rs, t, c.r, -90, 18); c.r = -90;
    setFace(c, t, false);
    c.lying = id;
    foley.push({ name: "cloth", at: t + 6, volume: 0.4 });
    return t + 20;
  }

  for (const a of actions) {
    const c = cast.get(a.who);
    if (!c) { warn(`action ${a.do} at ${a.at}s: no cast member "${a.who}"`); continue; }
    let f = Math.max(F(a.at), c.busy);
    if (f >= total) { warn(`${a.who} ${a.do} at ${a.at}s starts after the shot ends`); continue; }
    const dur = a.dur ? F(a.dur) : undefined;
    if ((a.do === "look" || a.do === "face") && a.target === "camera") {
      // to the audience: the face turns round to the lens, until the next thing they do
      endGaze(c, f);
      c.turns.push([f, 0]); c.toCamera = true;
      c.busy = Math.max(c.busy, f + 6);
      continue;
    }
    const tp = a.target ? props.get(a.target) : undefined;
    const tc = a.target ? cast.get(a.target) : undefined;
    // doing something new takes the eyes off whatever they were looking at
    if (!["say", "think", "mood", "look", "face"].includes(a.do)) endGaze(c, f);
    if (a.target && !tp && !tc) { warn(`${a.who} ${a.do}: no "${a.target}" in the shot`); continue; }
    switch (a.do) {
      case "walk": case "run": case "enter": {
        let tx: number;
        if (typeof a.to === "number") tx = 100 + a.to * (W - 200);
        else if (a.to === "left") tx = -200;
        else if (a.to === "right") tx = W + 200;
        else if (tp) tx = tp.x + (c.x < tp.x ? -1 : 1) * ((PROPS[tp.kind].w * tp.s) / 2 + 70 * c.s);
        else if (tc) tx = tc.x + (c.x < tc.x ? -1 : 1) * 230 * c.s;
        else { warn(`${a.who} ${a.do}: walk where?`); continue; }
        const rowName = tp && (tp.row === "back" || tp.row === "mid" || tp.row === "front") ? tp.row : c.row;
        f = walkTo(c, f, tx, rowName, a.do === "run");
        if (tc) { setFace(c, f, tc.x < c.x); setFace(tc, Math.max(f, tc.busy), c.x < tc.x); }
        break;
      }
      case "exit": f = walkTo(c, f, a.to === "left" || (a.to === undefined && c.x < W / 2) ? -220 : W + 220); break;
      case "sit": {
        const id = a.target ?? [...props.values()].find((p) => PROPS[p.kind].seat && !PROPS[p.kind].seat!.lie)?.spec.id;
        if (!id) { warn(`${a.who} sit: nothing to sit on`); setPose(c, f, "sit-slump"); break; }
        f = sitOn(c, f, id);
        break;
      }
      case "stand": f = standUp(c, f); break;
      case "lie": case "sleep": {
        const id = a.target ?? [...props.values()].find((p) => p.kind === "bed" || p.kind === "sofa")?.spec.id;
        if (id && !c.lying) f = lieOn(c, f, id);
        if (a.do === "sleep") { c.moods.push([f, "sleep"]); foley.push({ name: "breath", at: f + 10, volume: 0.25, seconds: 3 }); }
        break;
      }
      case "wake": {
        c.moods.push([f, "tired"]);
        f += 20;
        if (c.lying) f = standUp(c, f);
        break;
      }
      case "pick": {
        if (!tp) { warn(`${a.who} pick: pick what?`); continue; }
        if (tp.holder) { warn(`${a.who} pick ${tp.spec.id}: someone already holds it`); continue; }
        if (c.holding) { warn(`${a.who} pick: hands full (holding ${c.holding})`); continue; }
        if (c.seated && !near(c, ...propGrip(tp))) f = standUp(c, f);
        const [gx, gy] = propGrip(tp);
        f = approach(c, f, gx, gy, tp.row);
        const R = 14;
        c.reach.push({ at: f, dur: R, x: gx, y: gy });
        tp.held.push({ from: f + R, by: c.layerIndex });
        tp.holder = c.spec.id; c.holding = tp.spec.id;
        setPose(c, f + R, c.seated ? "sit-hold" : "hold");
        foley.push({ name: tp.kind.startsWith("book") || tp.kind === "paper" || tp.kind === "notebook" ? "book-flip" : "rustle", at: f + R, volume: 0.4 });
        f += R + 12;
        break;
      }
      case "put": {
        const item = c.holding ? props.get(c.holding) : undefined;
        if (!item) { warn(`${a.who} put: holding nothing`); continue; }
        // where: on the target surface (a prop with a top, or a built-in one), else the floor at the feet
        let sx: number, sy: number, ss: number, sz: number, row: PropState["row"], support: string;
        const sf = a.target && place.surfaces?.[a.target];
        if (tp && PROPS[tp.kind].top) {
          const top = PROPS[tp.kind].top!;
          const w = top.w * tp.s;
          sx = tp.x - w / 2 + 30 * tp.s + (a.spot ?? 0.5) * (w - 60 * tp.s); sy = tp.y - top.y * tp.s; ss = tp.s; sz = tp.z + 2; row = tp.row; support = tp.spec.id;
        } else if (sf) {
          sx = a.spot !== undefined ? sf.x0 + a.spot * (sf.x1 - sf.x0) : c.x + (c.flip ? -1 : 1) * 200 * c.s; sy = sf.y; ss = sf.s; sz = sf.z; row = "builtin"; support = a.target!;
        } else {
          sx = c.x + (c.flip ? -1 : 1) * 170 * c.s; sy = place.rows[c.row].y; ss = c.s; sz = c.z + 1; row = c.row; support = "floor";
        }
        ss *= item.spec.size ?? 1;
        const g = PROPS[item.kind].grip ?? [0, -PROPS[item.kind].h / 2];
        const gx = sx + g[0] * ss, gy = sy + g[1] * ss;
        f = approach(c, f, gx, gy, row);
        const R = 14;
        c.reach.push({ at: f, dur: R, x: gx, y: gy });
        const rel = f + R;
        const last = item.held[item.held.length - 1];
        if (last) last.until = rel;
        item.xs.push([rel - 1, item.x], [rel, sx]); item.ys.push([rel - 1, item.y], [rel, sy]);
        if (ss !== item.s) item.ss.push([rel - 1, item.s], [rel, ss]);
        item.zs.push([rel, sz]);
        Object.assign(item, { x: sx, y: sy, s: ss, z: sz, row, support, holder: undefined });
        c.holding = undefined;
        setPose(c, rel, c.seated ? "sit-chair" : "stand");
        foley.push({ name: "thud", at: rel, volume: 0.22 });
        f = rel + 10;
        break;
      }
      case "give": {
        const item = c.holding ? props.get(c.holding) : undefined;
        if (!item || !tc) { warn(`${a.who} give: needs to hold something and a person to give it to`); continue; }
        if (tc.holding) { warn(`${a.who} give: ${tc.spec.id}'s hands are full`); continue; }
        if (Math.abs(tc.x - c.x) > 2 * REACH * c.s * 0.85 || tc.row !== c.row) {
          f = walkTo(c, f, tc.x + (c.x < tc.x ? -1 : 1) * 1.5 * REACH * c.s, tc.row);
        }
        setFace(c, f, tc.x < c.x); setFace(tc, f, c.x < tc.x);
        const mx = (c.x + tc.x) / 2, my = c.y - (BODY.hip + 60) * c.s;
        const R = 16;
        c.reach.push({ at: f, dur: R + 6, x: mx, y: my });
        tc.reach.push({ at: f + 4, dur: R + 2, x: mx, y: my });
        const hand = f + R;
        const last = item.held[item.held.length - 1];
        if (last) last.until = hand;
        item.held.push({ from: hand, by: tc.layerIndex });
        item.holder = tc.spec.id; tc.holding = item.spec.id; c.holding = undefined;
        setPose(c, hand + 6, "stand"); setPose(tc, hand + 6, "hold");
        foley.push({ name: "rustle", at: hand, volume: 0.35 });
        f = hand + 14;
        tc.busy = Math.max(tc.busy, f);
        break;
      }
      case "use": case "write": case "press": {
        if (!tp) { warn(`${a.who} ${a.do}: on what?`); continue; }
        const d = dur ?? F(a.do === "press" ? 0.6 : 2.5);
        if (tp.holder === c.spec.id) {
          // a held phone or book: look at it
          setPose(c, f, c.seated ? "sit-hold" : "hold");
          gaze(c, f, c.x + (c.flip ? -1 : 1) * 150 * c.s, c.y - (c.seated ? 120 : 330) * c.s, f + d);
          tp.ons.push([f, true]);
          if (tp.kind === "phone") foley.push({ name: "click", at: f + 4, volume: 0.35 });
          f += d;
          break;
        }
        const pt = PROPS[tp.kind];
        // the point a hand works at: the top of the thing (keys, a page), or its face for wall things
        const wx = tp.x + (tp.kind === "laptop" ? -40 : 0) * tp.s;
        const wy = tp.row === "wall" ? tp.y - pt.h * tp.s * 0.5 : tp.y - Math.min(pt.h, 60) * tp.s + (tp.kind === "laptop" ? 46 * tp.s : 0);
        f = approach(c, f, wx, wy, tp.row);
        const wiggle = a.do === "press" ? 0 : a.do === "write" ? 14 * tp.s : 8 * tp.s;
        c.reach.push({ at: f, dur: d, x: wx, y: wy, wiggle });
        // seated at it: the hand then rests on the desk by the thing until they get up
        if (c.seated && a.do !== "press") {
          for (const r of c.reach) if (r.hold && r.release === undefined) r.release = f;
          c.reach.push({ at: f + d, dur: 1, x: wx - (c.flip ? -1 : 1) * 30 * tp.s, y: tp.y - 4 * tp.s, hold: true, ease: 14 });
        }
        if (["laptop", "phone", "tv", "lamp-desk", "lamp-floor", "stove"].includes(tp.kind)) tp.ons.push([f + 10, true]);
        foley.push(a.do === "write" ? { name: "marker-write", at: f + 10, volume: 0.4, seconds: Math.min(d / fps, 4) }
          : a.do === "press" ? { name: "click", at: f + 10, volume: 0.5 }
            : tp.kind === "laptop" ? { name: "typing-soft", at: f + 10, volume: 0.5, seconds: Math.min(d / fps, 6) }
              : tp.kind.startsWith("book") ? { name: "book-flip", at: f + 10, volume: 0.45 } : { name: "rustle", at: f + 10, volume: 0.3 });
        f += d + 10;
        break;
      }
      case "switch": {
        if (!tp) { warn(`${a.who} switch: switch what?`); continue; }
        const now = tp.ons.length ? tp.ons[tp.ons.length - 1][1] : tp.spec.lit ?? false;
        tp.ons.push([f + 12, !now]);
        foley.push({ name: tp.kind === "door" ? (now ? "door-close" : "door-open") : "click", at: f + 12, volume: 0.5 });
        f += 18;
        break;
      }
      case "look": case "face": {
        const tx = tp ? tp.x : tc ? tc.x : a.to === "left" ? -1 : a.to === "right" ? W + 1 : undefined;
        if (tx === undefined) { warn(`${a.who} ${a.do}: look where?`); continue; }
        setFace(c, f, tx < c.x);
        if (a.do === "look") {
          c.looks.push([f, 0.8]);
          if (tc) gaze(c, f, ...headOf(tc), dur ? f + dur : undefined);
          else if (tp) gaze(c, f, tp.x, tp.y - PROPS[tp.kind].h * tp.s * 0.5, dur ? f + dur : undefined);
        }
        f += 6;
        break;
      }
      case "pose": {
        if (!a.pose) { warn(`${a.who} pose: which pose?`); continue; }
        if (c.lying) { warn(`${a.who} pose ${a.pose}: is lying down`); continue; }
        const before = c.pose;
        setPose(c, f, a.pose);
        if (a.pose === "wave" || a.pose === "cheer") foley.push({ name: "cloth", at: f + 4, volume: 0.3 });
        if (dur) { setPose(c, f + dur, before); f += dur; } else f += 12;
        break;
      }
      case "mood": if (a.mood) c.moods.push([f, a.mood]); if (a.mood === "sad" || a.mood === "tired") foley.push({ name: "sigh", at: f + 4, volume: 0.35 }); break;
      case "say": case "think": {
        if (!a.text) { warn(`${a.who} ${a.do}: says nothing`); continue; }
        const d = dur ?? F(Math.max(1.6, a.text.split(/\s+/).length * 0.38));
        late.push({ t: "caption", style: a.do === "think" ? "whisper" : "speech", text: a.text, at: f, until: Math.min(total, f + d), x: 960, y: 150, big: true } as FilmLayer);
        if (a.mood) c.moods.push([f, a.mood]);
        if (a.do === "say") {
          c.talks.push([f, Math.min(total, f + d)]);
          // speaking to someone: face them and look at them (if not in the middle of something); they look back
          const listener = tc ?? [...cast.values()].filter((o) => o !== c).sort((p, q) => Math.abs(p.x - c.x) - Math.abs(q.x - c.x))[0];
          if (listener && !c.toCamera) {
            if (c.busy <= f && !c.lying) setFace(c, f, listener.x < c.x);
            if (c.busy <= f) gaze(c, f, ...headOf(listener));
            if (listener.busy <= f && !listener.lying && !listener.toCamera) { setFace(listener, f, c.x < listener.x); gaze(listener, f + 4, ...headOf(c)); }
          }
        }
        break; // talking does not keep the body busy
      }
    }
    c.busy = Math.max(c.busy, f);
  }

  // ── emit layers: props then people (their indexes were fixed up front) ──
  for (const p of props.values()) {
    const held = p.held.length ? p.held : undefined;
    // a carried thing draws just above its carrier, then goes back to where it was put
    const zs: [number, number][] = [];
    for (const h of p.held) {
      const carrier = [...cast.values()].find((c) => c.layerIndex === h.by);
      zs.push([h.from, (carrier ? Math.max(carrier.initZ, ...carrier.zs.map(([, z]) => z)) : 32) + 1]);
      if (h.until !== undefined) zs.push([h.until, p.zs.find(([f]) => f >= h.until!)?.[1] ?? p.z]);
    }
    const homeZ = p.held[0]?.from === 0 ? p.z : (p.zs.length ? zIn(p) : p.z);
    layers[p.layerIndex] = {
      t: "prop", kind: p.kind, label: p.spec.label, color: p.spec.color, flip: p.flip, on: p.spec.lit ?? false, shadow: p.support !== "wall",
      at: 0, x: keyed(p.xs, p.x, "linear"), y: keyed(p.ys, p.y, "linear"), s: keyed(p.ss, p.s, "linear"), r: 0, o: 1, blur: 0,
      ...(zs.length ? { zs: [[0, homeZ] as [number, number], ...zs].sort((a, b) => a[0] - b[0]) } : { z: p.z }),
      ons: p.ons.length ? p.ons : undefined, held,
    } as unknown as FilmLayer;
  }
  function zIn(p: PropState) { return p.zs.length ? p.zs[0][1] : p.z; }
  for (const c of cast.values()) {
    layers[c.layerIndex] = {
      t: "person", who: c.spec.who, pose: c.initPose, poses: c.poses.length ? c.poses : undefined, poseDur: 14, poseAt: 0,
      at: 0, x: keyed(c.xs, c.x), y: keyed(c.ys, c.y), s: keyed(c.ss, c.s), r: keyed(c.rs, c.r), o: 1, blur: 0,
      flip: c.initFlip, faces: c.faces.length ? c.faces : undefined, mood: c.spec.mood, moods: c.moods.length ? c.moods : undefined,
      looks: c.looks.length ? c.looks : undefined, reach: c.reach.length ? c.reach : undefined,
      gazes: c.gazes.length ? c.gazes : undefined, turns: c.turns.length ? c.turns : undefined, talks: c.talks.length ? c.talks : undefined,
      eyes: true, look: 0, fg: false, holds: "none", shadow: true, shirt: c.spec.shirt,
      ...(c.zs.length ? { zs: [[0, c.initZ] as [number, number], ...c.zs] } : { z: c.initZ }),
    } as unknown as FilmLayer;
  }
  layers.push(...late);

  // ── light & weather ──
  const fxl = (kind: string, extra: object = {}) => layers.push({ t: "fx", kind, amount: 1, x: 960, y: 540, at: 0, ...extra } as FilmLayer);
  if (shot.time === "rain") fxl("rain", { amount: 0.8 });
  for (const k of shot.fx) fxl(k, k === "glow" ? { amount: 0.8 } : {});
  if (shot.time === "dusk") fxl("tint", { color: "#ff9a5a", amount: 0.18 });
  if (shot.time === "night" && place.env?.kind === "room") {
    for (const p of props.values()) if (p.spec.lit && (p.kind === "lamp-desk" || p.kind === "lamp-floor")) fxl("glow", { x: p.x, y: p.y - PROPS[p.kind].h * p.s * 0.6, amount: 0.7, z: 5 });
  }
  if (shot.place !== "black" && shot.place !== "paper") { fxl("vignette", { amount: shot.time === "night" ? 1 : 0.6 }); fxl("grain"); }
  for (const cp of shot.captions) layers.push({ t: "caption", style: cp.style, text: cp.text, at: F(cp.at), until: cp.dur ? F(cp.at + cp.dur) : undefined, x: 960, y: cp.style === "title" ? 560 : 150, big: true } as FilmLayer);

  const film = FilmSchema.parse({ layers, cam: camera(), fadeIn: F(shot.fadeIn), fadeOut: F(shot.fadeOut), foley: foley.filter((s) => s.at < total - 2) });
  return { film, warnings };

  // ── helpers that need the state above ──
  function keyed(arr: [number, number][], last: number, ease: "linear" | "inout" = "inout") {
    if (!arr.length) return last;
    return { keys: [[0, arr[0][1]], ...arr].sort((a, b) => a[0] - b[0]) as [number, number][], ease };
  }

  function camera(): FilmSpec["cam"] {
    const on = shot.camera.on === undefined ? [] : Array.isArray(shot.camera.on) ? shot.camera.on : [shot.camera.on];
    const size = shot.camera.shot;
    // the box to frame, measured where each subject is when the shot starts (or at the end of its first move)
    const boxes = on.map((id) => {
      const c = cast.get(id);
      if (c) {
        const l = layers[c.layerIndex] as FilmLayer & { t: "person" };
        const mid = Math.min(total - 1, Math.max(0, Math.round(total * 0.5)));
        const x = typeof l.x === "number" ? l.x : valAt(l.x, mid), y = typeof l.y === "number" ? l.y : valAt(l.y, mid), s = typeof l.s === "number" ? l.s : valAt(l.s, mid);
        const r = typeof l.r === "number" ? l.r : valAt(l.r, mid);
        if (Math.abs(r) > 45) return { x0: x - 520 * s, x1: x + 40 * s, y0: y - 120 * s, y1: y + 90 * s, head: [x - 440 * s, y] as [number, number], s };
        const top = y - BODY.height * s;
        const boxH = size === "close" ? 230 * s : size === "medium" ? 360 * s : 620 * s;
        return { x0: x - 130 * s, x1: x + 130 * s, y0: top - 20 * s, y1: top - 20 * s + boxH, head: [x, y - BODY.head * s] as [number, number], s };
      }
      const p = props.get(id);
      if (p) {
        const sp = PROPS[p.kind];
        return { x0: p.x - (sp.w * p.s) / 2, x1: p.x + (sp.w * p.s) / 2, y0: p.y - sp.h * p.s, y1: p.y, head: [p.x, p.y - (sp.h * p.s) / 2] as [number, number], s: p.s };
      }
      warn(`camera: no "${id}" to look at`);
      return undefined;
    }).filter((b): b is NonNullable<typeof b> => !!b);
    let zoom = 1, cx = 960, cy = 540;
    if (boxes.length && size !== "wide") {
      const x0 = Math.min(...boxes.map((b) => b.x0)), x1 = Math.max(...boxes.map((b) => b.x1));
      const y0 = Math.min(...boxes.map((b) => b.y0)), y1 = Math.max(...boxes.map((b) => b.y1));
      const pad = size === "detail" ? 2.2 : 1.25;
      zoom = Math.max(1, Math.min(size === "detail" ? 5 : 3.6, Math.min(H / ((y1 - y0) * pad), W / ((x1 - x0) * pad * 1.15))));
      cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
    }
    const clampC = (z: number, x: number, y: number): [number, number] => [Math.max(960 / z, Math.min(W - 960 / z, x)), Math.max(540 / z, Math.min(H - 540 / z, y))];
    const mv = shot.camera.move;
    if (mv === "push-in" || mv === "pull-out") {
      const z0 = mv === "push-in" ? Math.max(1, zoom * 0.86) : zoom * 1.22, z1 = mv === "push-in" ? zoom : Math.max(1, zoom);
      const [ax, ay] = clampC(z0, cx, cy), [bx, by] = clampC(z1, cx, cy);
      return { zoom: { from: z0, to: z1, dur: total, ease: "inout" }, x: { from: ax, to: bx, dur: total }, y: { from: ay, to: by, dur: total } };
    }
    if (mv === "pan-left" || mv === "pan-right") {
      const z = Math.max(zoom, 1.15), d = (mv === "pan-right" ? 1 : -1) * 160;
      const [ax, ay] = clampC(z, cx - d, cy), [bx] = clampC(z, cx + d, cy);
      return { zoom: z, x: { from: ax, to: bx, dur: total, ease: "inout" }, y: ay };
    }
    if (mv === "follow" && on.length) {
      const c = cast.get(on[0]);
      const l = c && (layers[c.layerIndex] as FilmLayer & { t: "person" });
      if (l && typeof l.x === "object" && "keys" in l.x) {
        const z = Math.max(zoom, 1.3);
        return { zoom: z, x: { keys: l.x.keys.map(([f, x]) => [f, clampC(z, x, cy)[0]] as [number, number]), ease: "inout" }, y: clampC(z, cx, cy)[1] };
      }
    }
    const [sx, sy] = clampC(zoom, cx, cy);
    // even a "static" shot breathes: a very slow push
    return { zoom: { from: zoom, to: zoom * 1.03, dur: total, ease: "linear" }, x: sx, y: sy };
  }
}

/** Value of a keyed Anim (linear) at a frame, for framing decisions. */
function valAt(a: unknown, f: number): number {
  const k = (a as { keys: [number, number][] }).keys;
  if (!k) return 0;
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (f <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * (f - k[i - 1][0])) / Math.max(1, k[i][0] - k[i - 1][0]);
  return k[k.length - 1][1];
}

/** Compile once per shot object (the renderer calls this every frame). */
const cache = new WeakMap<object, Directed>();
export function directCached(shot: Shot | ShotInput, fps = FPS): Directed {
  const hit = cache.get(shot);
  if (hit) return hit;
  const d = direct(shot, { fps });
  cache.set(shot, d);
  return d;
}

/** The vocabulary as text, for the LLM that writes shots. */
export function catalog(): string {
  const furniture = PROP_KINDS.filter((k) => PROPS[k].mount === "floor");
  const wall = PROP_KINDS.filter((k) => PROPS[k].mount === "wall");
  const items = PROP_KINDS.filter((k) => PROPS[k].mount === "surface");
  const seats = PROP_KINDS.filter((k) => PROPS[k].seat);
  const tops = PROP_KINDS.filter((k) => PROPS[k].top);
  return [
    `places: ${PLACE_NAMES.join(", ")} (bedroom has bed, pillow, nightstand, lamp, window, clock; study has desk, chair, lamp, bookcase, window, clock; kitchen has counter, stove, fridge, window; classroom has board, desk, clock; office has desk, chair, laptop, window, plant; living-room has sofa, lamp, tv-stand, tv, window; park has bench, bin; shop has a built-in "counter"; desk-closeup has a built-in "desk" with the person seated behind it)`,
    `floor furniture: ${furniture.join(", ")}`,
    `wall things: ${wall.join(", ")}`,
    `small things (stand on a surface or are carried): ${items.join(", ")}`,
    `can be sat on: ${seats.join(", ")}. things can be put on: ${tops.join(", ")}`,
    `actions: ${ACTIONS.join(", ")}`,
    `poses: ${PERSON_POSES.join(", ")}. moods: ${MOODS.join(", ")}`,
    `camera shot: ${SHOT_SIZES.join(", ")}; move: ${MOVES.join(", ")}`,
  ].join("\n");
}
