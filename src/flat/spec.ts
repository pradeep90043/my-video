import { z } from "zod";

/**
 * FLAT-VECTOR: a general flat-2D engine. Characters are one body template dressed from a parts catalog (hair, headwear,
 * face, clothes, accessories, any skin colour), animated lightly (breathing, blinking, talking mouth, gestures, entrances),
 * on parametric backgrounds, with info-graphics, titles and name tags. No pictures, no GPU: everything is drawn here.
 *
 * Every list below is the catalog the planner may choose from (exported to the server by scripts/flat/export-catalog.ts).
 * Unknown values never break a render: each field falls back to a safe default.
 */

export const SKINS = { light: "#f3d2b6", fair: "#e9bf9c", wheat: "#d9a57c", tan: "#c58b5e", brown: "#a06b45", dark: "#6e4630" } as const;
export const HAIR_STYLES = ["short", "side-part", "spiky", "curly", "bald", "long", "bun", "ponytail", "braid", "jata", "afro", "wavy"] as const;
export const HEADWEAR = ["none", "crown", "mukut", "horns", "turban", "cap", "hijab", "veil", "halo", "helmet", "hat", "tiara", "peacock-feather", "headband"] as const;
export const UPPER = ["tshirt", "shirt", "suit", "hoodie", "kurta", "bare", "armor", "blouse", "robe", "coat", "sweater", "uniform"] as const;
export const LOWER = ["pants", "jeans", "shorts", "skirt", "dhoti", "saree", "lehenga", "none"] as const;
export const ACCESSORIES = ["necklace", "earrings", "armlets", "bangles", "belt", "watch", "bag", "scarf", "sash", "glasses", "tie"] as const;
export const MARKS = ["none", "bindi", "tilak", "tripundra", "namam", "scar", "freckles"] as const;
export const FACIAL = ["none", "beard", "moustache", "beard-long", "stubble"] as const;
export const EYES = ["normal", "glow", "closed", "big"] as const;
export const MOODS = ["neutral", "happy", "sad", "angry", "scared", "surprised", "evil", "calm"] as const;
export const GESTURES = [
  "idle", "wave", "point", "namaste", "raise", "shrug", "arms-crossed", "hands-hips", "hold", "present", "cry", "think",
  "attack", "bless", "talk", "hold-up", "cover-mouth", "salute",
] as const;
export const PROPS = [
  "phone", "book", "diya", "sword", "bow", "flower", "cup", "gift", "laptop", "bag", "mic", "letter", "flag", "trident",
  "mace", "flute", "conch", "kalash", "money", "torch", "umbrella", "cane", "pen", "coin", "crown", "heart", "key", "bulb",
  "clock", "globe", "rocket", "chart", "lock", "star", "fire", "water", "leaf", "skull", "check", "cross", "question",
] as const;
export const BACKGROUNDS = [
  "night", "sunburst", "glow", "sky", "city", "village", "palace", "temple", "room", "office", "classroom", "forest",
  "mountains", "sea", "space", "plain",
] as const;
export const FX = ["none", "stars", "dust", "embers", "rings", "rays", "snow", "rain", "petals", "fireflies", "sparkle", "confetti"] as const;
export const ENTERS = ["none", "fade", "slide-left", "slide-right", "pop", "rise"] as const;
export const CAMERAS = ["static", "push", "pull", "pan-left", "pan-right"] as const;
export const GRAPHICS = ["calendar", "clock", "compass", "scroll", "nodes", "stat", "list", "versus", "timeline", "icon", "bars", "date-card", "statement"] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const color = (d: string) => hex.catch(d).default(d);
/** A list that keeps its good entries: a bad one is dropped (not the whole list), a long one is cut to `max`. */
const listOf = <S extends z.ZodTypeAny>(item: S, max: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v.filter((x) => item.safeParse(x).success).slice(0, max) : []), z.array(item)).catch([]).default([]);
const pick = <T extends readonly [string, ...string[]]>(list: T, d: T[number]) => z.enum(list).catch(d).default(d);

/** A person, built from parts. `skin` is a SKINS name or any colour (blue, green, purple for gods, demons, aliens...). */
export const CharacterSchema = z.object({
  id: z.string().min(1).max(30),
  name: z.string().max(40).optional(),
  gender: pick(["male", "female"] as const, "male"),
  age: pick(["child", "teen", "adult", "old"] as const, "adult"),
  build: pick(["slim", "regular", "heavy"] as const, "regular"),
  skin: z.string().catch("wheat").default("wheat"),
  hair: pick(HAIR_STYLES, "short"),
  hairColor: color("#2b1d16"),
  headwear: pick(HEADWEAR, "none"),
  headwearColor: color("#e2a93b"),
  upper: pick(UPPER, "tshirt"),
  upperColor: color("#3e6fa8"),
  lower: pick(LOWER, "pants"),
  lowerColor: color("#2f3a4a"),
  accent: color("#e2a93b"),
  accessories: listOf(z.enum(ACCESSORIES), 6),
  mark: pick(MARKS, "none"),
  facial: pick(FACIAL, "none"),
  eyes: pick(EYES, "normal"),
  fangs: z.boolean().catch(false).default(false),
  /** drawn as a black shape with glowing eyes (the feared one, a mystery person) */
  silhouette: z.boolean().catch(false).default(false),
});
export type CharacterSpec = z.infer<typeof CharacterSchema>;

/** One timed change for a character inside a shot (seconds from the start of the shot). */
export const BeatSchema = z.object({
  at: z.number().min(0).catch(0),
  gesture: z.enum(GESTURES).optional().catch(undefined),
  mood: z.enum(MOODS).optional().catch(undefined),
  talking: z.boolean().optional().catch(undefined),
  /** walk to this x (0..1 of the frame width) */
  moveTo: z.number().min(0).max(1).optional().catch(undefined),
  say: z.string().max(80).optional().catch(undefined),
});

export const CastInShotSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(1).optional().catch(undefined),
  scale: z.number().min(0.4).max(1.6).catch(1).default(1),
  gesture: pick(GESTURES, "idle"),
  mood: pick(MOODS, "neutral"),
  talking: z.boolean().catch(false).default(false),
  prop: z.enum(PROPS).optional().catch(undefined),
  enter: pick(ENTERS, "fade"),
  /** a name tag next to the character: "The Prince" / "Son of King Hema" */
  tag: z.object({ name: z.string().max(30), sub: z.string().max(40).optional() }).optional().catch(undefined),
  /** a speech bubble above the head */
  say: z.string().max(80).optional().catch(undefined),
  /** looks toward this side (eyes) */
  look: pick(["center", "left", "right", "up"] as const, "center"),
  beats: listOf(BeatSchema, 8),
});
export type CastInShot = z.infer<typeof CastInShotSchema>;

export const GraphicSchema = z.object({
  type: z.enum(GRAPHICS),
  title: z.string().max(60).optional().catch(undefined),
  /** labels, list items, calendar days, node labels, timeline points */
  items: z.array(z.string().max(40)).max(8).catch([]).default([]),
  /** small text under each item (same order) */
  subs: z.array(z.string().max(40)).max(8).catch([]).default([]),
  /** the item that is highlighted (calendar day, compass point, node) */
  highlight: z.number().int().min(0).max(7).optional().catch(undefined),
  /** stat: the number; bars: values (same order as items); clock: hour */
  value: z.number().optional().catch(undefined),
  values: z.array(z.number()).max(8).catch([]).default([]),
  icons: z.array(z.enum(PROPS).catch("star")).max(8).catch([]).default([]),
  /** compass: N/E/S/W; date-card / statement: the text */
  text: z.string().max(90).optional().catch(undefined),
});
export type GraphicSpec = z.infer<typeof GraphicSchema>;

export const ShotSchema = z.object({
  bg: pick(BACKGROUNDS, "plain"),
  /** two colours that tint the background (sky / glow / rays), optional */
  palette: z.array(hex).max(3).catch([]).default([]),
  fx: pick(FX, "none"),
  camera: pick(CAMERAS, "push"),
  /** the heading at the top with an underline */
  title: z.string().max(60).optional().catch(undefined),
  cast: listOf(CastInShotSchema, 8),
  graphic: GraphicSchema.optional().catch(undefined),
  /** a single big object in the middle (with a glow) when there is no one on screen */
  object: z.enum(PROPS).optional().catch(undefined),
  /** carries on from the previous shot (same place): no fade between them */
  cont: z.boolean().catch(false).default(false),
});
export type ShotSpec = z.infer<typeof ShotSchema>;

export const FlatVideoSchema = z.object({
  title: z.string().optional(),
  characters: z.array(CharacterSchema).max(8),
  shots: z.array(ShotSchema.extend({ sec: z.number().min(0.5).max(30), caption: z.string().optional() })),
  audio: z.string().optional(),
  captions: z.boolean().optional(),
});
export type FlatVideoSpec = z.infer<typeof FlatVideoSchema>;

/** The catalog as data, for the planner prompt and the server's sanitiser. */
export const FLAT_CATALOG = {
  skins: Object.keys(SKINS), hair: HAIR_STYLES, headwear: HEADWEAR, upper: UPPER, lower: LOWER, accessories: ACCESSORIES,
  marks: MARKS, facial: FACIAL, eyes: EYES, moods: MOODS, gestures: GESTURES, props: PROPS, backgrounds: BACKGROUNDS, fx: FX,
  enters: ENTERS, cameras: CAMERAS, graphics: GRAPHICS,
};

export const skinColor = (s: string): string => (SKINS as Record<string, string>)[s] ?? (/^#[0-9a-fA-F]{6}$/.test(s) ? s : SKINS.wheat);

/** Colour helpers for flat shading (one darker tone for folds and the far side). */
export function shade(hexColor: string, amt: number): string {
  const n = parseInt(hexColor.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
