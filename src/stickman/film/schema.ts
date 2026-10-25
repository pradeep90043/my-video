/**
 * Cinematic "film" shot: a stack of layers (environment, silhouettes, hands, phone / calendar / screen UI, props, captions,
 * light and weather) drawn in a fixed 1920x1080 space under one camera. A shot is described, never scripted: the renderer
 * only interpolates the numbers it is given. See FilmStage.tsx.
 */
import { z } from "zod";

const AnimSchema = z.union([
  z.number(),
  z.object({ from: z.number(), to: z.number(), at: z.number().optional(), dur: z.number().optional(), ease: z.enum(["linear", "in", "out", "inout"]).optional() }),
  z.object({ keys: z.array(z.tuple([z.number(), z.number()])).min(2), ease: z.enum(["linear", "in", "out", "inout"]).optional() }),
]);

export const ENV_KINDS = [
  "shop-counter", "shop-window", "shop-floor", "home-wall", "home-door", "dark-table", "desk-night", "desk-dawn", "street-view", "hill-day", "black", "paper",
  "room", "park",
] as const;
export type EnvKind = (typeof ENV_KINDS)[number];
export const GRADES = ["day", "dusk", "night", "rain"] as const;
export const WHO = ["customer", "seller", "student"] as const;
export const PERSON_POSES = [
  "stand", "lean", "point", "hand-over", "shrug", "slump", "hold", "reach", "walk", "run", "sit", "look-up", "sit-read", "sit-bench", "sit-chair", "sit-slump", "sit-hold", "lie",
  "wave", "laugh", "think", "cry", "cheer", "arms-crossed", "facepalm",
] as const;
export const MOODS = ["neutral", "sad", "worried", "happy", "tired", "sleep", "angry", "surprised"] as const;
export const HAND_KINDS = ["point", "open", "press", "grab", "pinch", "write", "flat"] as const;
export const BOOK_KINDS = ["box", "pair", "stack", "bag", "crumpled", "open", "single"] as const;
export const CAPTION_STYLES = ["speech", "excuse", "title", "whisper"] as const;
/** Things drawn by props.tsx (origin = the middle of the bottom edge, so `y` is the surface they stand on). */
export const PROP_KINDS = [
  "desk", "table", "chair", "stool", "nightstand", "bed", "sofa", "bench", "bookcase", "wardrobe", "fridge", "kitchen-counter", "stove", "tv-stand", "tv",
  "plant", "lamp-floor", "door", "trash-bin", "whiteboard", "window", "poster", "clock", "wall-shelf", "picture", "mirror",
  "laptop", "book", "book-open", "book-stack", "books-box", "notebook", "phone", "mug", "bottle", "glass", "plate", "bowl", "lamp-desk",
  "bag", "ball", "alarm-clock", "pillow", "pen", "paper", "box", "gift", "cake", "dumbbell", "guitar", "headphones", "trophy", "flower-pot", "food",
] as const;
export const FX_KINDS = ["rain", "dust", "vignette", "tint", "glow", "grain", "leaves", "sunrays"] as const;

const base = {
  at: z.number().min(0).default(0),
  until: z.number().optional(),
  x: AnimSchema.default(960),
  y: AnimSchema.default(540),
  s: AnimSchema.default(1),
  r: AnimSchema.default(0),
  o: AnimSchema.default(1),
  /** blur radius in px: depth of field (a layer out of focus) */
  blur: AnimSchema.default(0),
  /** draw order; omit for the layer type's own default */
  z: z.number().optional(),
};

export const FilmLayerSchema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("env"), kind: z.enum(ENV_KINDS), grade: z.enum(GRADES).default("day"), depth: z.number().min(0).max(1).default(0.5), blur: AnimSchema.default(0), at: z.number().default(0), z: z.number().optional(),
    /** room / park colours */
    wall: z.string().optional(), floor: z.enum(["wood", "tile", "carpet", "concrete"]).optional(),
  }),
  z.object({
    t: z.literal("person"), ...base,
    who: z.enum(WHO), pose: z.enum(PERSON_POSES).default("stand"),
    /** blends into this pose over `dur` frames starting `poseAt` */
    to: z.enum(PERSON_POSES).optional(), poseAt: z.number().default(0), poseDur: z.number().default(18),
    flip: z.boolean().default(false), eyes: z.boolean().default(true),
    mood: z.enum(MOODS).default("neutral"),
    look: z.number().min(-1).max(1).default(0),
    /** step timelines, [frame, value]: later poses (each blends in over poseDur), facing (true = faces left), mood, eye direction */
    poses: z.array(z.tuple([z.number(), z.enum(PERSON_POSES)])).optional(),
    faces: z.array(z.tuple([z.number(), z.boolean()])).optional(),
    moods: z.array(z.tuple([z.number(), z.enum(MOODS)])).optional(),
    looks: z.array(z.tuple([z.number(), z.number().min(-1).max(1)])).optional(),
    /** face turn override, [frame, 0 = to the camera .. 1 = profile, or -1 = back to what the pose does] */
    turns: z.array(z.tuple([z.number(), z.number().min(-1).max(1)])).optional(),
    /** the head turns to look at a world point from `at` until `until` */
    gazes: z.array(z.object({ at: z.number(), until: z.number().optional(), x: z.number(), y: z.number() })).optional(),
    /** speaking, [from, to] frames: the mouth moves */
    talks: z.array(z.tuple([z.number(), z.number()])).optional(),
    /** the front hand goes to a world point (inverse kinematics) from `at` for `dur` frames; `hold` keeps it there; `wiggle` = typing / writing */
    reach: z.array(z.object({ at: z.number(), dur: z.number(), x: z.number(), y: z.number(), hold: z.boolean().optional(), release: z.number().optional(), ease: z.number().optional(), wiggle: z.number().optional() })).optional(),
    /** a soft contact shadow on the ground at the feet */
    shadow: z.boolean().default(false),
    /** draw order over time, [frame, z] (walking from the back row to the front) */
    zs: z.array(z.tuple([z.number(), z.number()])).optional(),
    /** shirt colour (a tint on the silhouette's torso) */
    shirt: z.string().optional(),
    /** in front of the counter (an over-the-shoulder foreground figure) */
    fg: z.boolean().default(false),
    /** what the figure carries */
    holds: z.enum(["box", "none"]).default("none"),
  }),
  z.object({
    t: z.literal("hand"), ...base,
    kind: z.enum(HAND_KINDS).default("open"),
    /** the side the arm comes in from */
    from: z.enum(["left", "right", "bottom", "top"]).default("right"),
    /** to this gesture at `gestureAt` (a hand that points, then presses) */
    to: z.enum(HAND_KINDS).optional(), gestureAt: z.number().default(0),
    cuff: z.string().optional(),
    /** in front of the phone / calendar, not behind them */
    over: z.boolean().default(true),
  }),
  z.object({
    t: z.literal("phone"), ...base,
    date: z.string().default("Tue, Sep 23"), time: z.string().default("5:30"), label: z.string().default("STUDY 3 HRS"),
    mode: z.enum(["alarm", "keyboard", "dark"]).default("alarm"),
    /** frames at which the SNOOZE button is pressed (it dims) */
    pressAt: z.number().optional(), pressTarget: z.enum(["snooze", "stop"]).default("snooze"),
    /** keyboard mode: the label as typed so far grows from `typeFrom` to `text`, one character per `typeEvery` frames */
    text: z.string().optional(), typeFrom: z.number().default(0), typeEvery: z.number().default(5), typeStart: z.string().default(""),
    ring: z.boolean().default(false),
  }),
  z.object({
    t: z.literal("calendar"), ...base,
    title: z.string().default("3 HRS EVERY DAY"),
    palette: z.enum(["pastel", "warm", "sheet"]).default("pastel"),
    marks: z.array(z.object({ c: z.number().int().min(0).max(6), r: z.number().int().min(0).max(3), kind: z.enum(["x", "check"]).default("x"), at: z.number().default(0) })).default([]),
    /** cells 0..27 already marked before the shot starts */
    filled: z.number().int().min(0).max(28).default(0), filledKind: z.enum(["x", "check"]).default("x"),
    crumple: AnimSchema.default(0),
  }),
  z.object({
    t: z.literal("screen"), ...base,
    title: z.string().default("3 HRS EVERY DAY"), typeFrom: z.string().optional(), typeAt: z.number().default(0), typeEvery: z.number().default(5),
    button: z.string().optional(), cursorAt: AnimSchema.optional(),
  }),
  z.object({ t: z.literal("books"), ...base, kind: z.enum(BOOK_KINDS).default("box"), label: z.string().optional(), lid: AnimSchema.default(0) }),
  z.object({
    t: z.literal("prop"), ...base,
    kind: z.enum(PROP_KINDS), label: z.string().optional(), color: z.string().optional(), flip: z.boolean().default(false),
    /** is it on (screen lit, lamp glowing, door open...) */
    on: z.boolean().default(false),
    /** carried: from..until it rides in the front hand of the person layer `by` (index into layers); `grip` is the held point, local */
    held: z.array(z.object({ from: z.number(), until: z.number().optional(), by: z.number().int().min(0), grip: z.tuple([z.number(), z.number()]).optional() })).optional(),
    shadow: z.boolean().default(true),
    /** switched on / off over time, [frame, on] */
    ons: z.array(z.tuple([z.number(), z.boolean()])).optional(),
    zs: z.array(z.tuple([z.number(), z.number()])).optional(),
  }),
  z.object({ t: z.literal("sign"), ...base, text: z.string().default("14-DAY RETURNS") }),
  z.object({ t: z.literal("poster"), ...base, text: z.string().default("1 MIN"), writeAt: z.number().optional(), writeDur: z.number().default(40), torn: z.boolean().default(false) }),
  z.object({ t: z.literal("fx"), kind: z.enum(FX_KINDS), amount: z.number().default(1), color: z.string().optional(), x: z.number().default(960), y: z.number().default(540), at: z.number().default(0), until: z.number().optional(), z: z.number().optional() }),
  z.object({ t: z.literal("caption"), style: z.enum(CAPTION_STYLES).default("speech"), text: z.string(), line2: z.string().optional(), big: z.boolean().default(false), at: z.number().default(0), until: z.number().optional(), x: z.number().default(960), y: z.number().default(170) }),
]);
export type FilmLayer = z.infer<typeof FilmLayerSchema>;

export const FilmSchema = z.object({
  layers: z.array(FilmLayerSchema).min(1).max(40),
  cam: z.object({ zoom: AnimSchema.default(1), x: AnimSchema.default(960), y: AnimSchema.default(540) }).default({ zoom: 1, x: 960, y: 540 }),
  /** sounds the director knows happen (a chair scrapes when sat on, a phone is put down): frames into the shot */
  foley: z.array(z.object({ name: z.string(), at: z.number(), volume: z.number().optional(), seconds: z.number().optional() })).default([]),
  /** fade from / to black over this many frames */
  fadeIn: z.number().default(0),
  fadeOut: z.number().default(0),
});
export type FilmSpec = z.infer<typeof FilmSchema>;
