/**
 * Data contract for stickman videos. A project's video.json has
 *   "template": "stickman", "theme": "light" | "dark"
 * and each scene may carry a `visual` block validated by StickmanVisualSchema.
 * Pure zod (no React) so scripts can validate it too.
 */
import { z } from "zod";
import { SCENE_ASSETS, SCENE_BACKGROUNDS, SCENE_TINTS } from "./doodle/catalog";

export const POSES = [
  "idle", "point", "present", "shrug", "think",
  "celebrate", "worried", "facepalm", "shocked", "walk",
  "angry", "laugh", "cry", "smug",
] as const;
export const MOODS = [
  "neutral", "happy", "worried", "shocked", "sad",
  "angry", "excited", "confused", "smug", "crying",
] as const;
/** Emotion sound effects (synthesised by `npm run longform:sfx` into public/audio/sfx/). */
export const SFX_NAMES = ["ding", "gasp", "sad", "boom", "fail", "tada", "scratch", "riser", "pop"] as const;
/** SFX played automatically when a scene's mood differs from the previous scene's. */
export const MOOD_SFX: Partial<Record<(typeof MOODS)[number], (typeof SFX_NAMES)[number]>> = {
  shocked: "gasp", sad: "sad", crying: "sad", angry: "boom", excited: "tada", confused: "scratch", smug: "ding",
};
export const PROP_TYPES = [
  "laptop", "bulb", "chartUp", "chartDown", "warning", "clock", "money", "robot",
  "question", "check", "cross", "rocket", "lock", "gear", "magnifier", "bug", "code",
] as const;
/** Distance from a grounded prop's origin down to its lowest point (world units, before scaling). */
export const GROUNDED_PROP_BOTTOM: Partial<Record<(typeof PROP_TYPES)[number], number>> = {
  laptop: 70, robot: 70, rocket: 75, lock: 98, gear: 108, bug: 66, code: 84, chartUp: 90, chartDown: 90,
};
/** Animated scene backdrop drawn behind the figure and panels. */
export const SETTINGS = ["none", "office", "classroom", "server", "city", "home", "stage", "space", "cloud"] as const;
export type SettingName = (typeof SETTINGS)[number];
export const ACCENTS = ["red", "blue", "gold", "green"] as const;

export const PropSchema = z.object({
  type: z.enum(PROP_TYPES),
  x: z.number().min(0).max(1).default(0.72),
  /** 0..1 of frame height. Omit: grounded props (laptop, robot, …) stand on the floor, others float mid-air. */
  y: z.number().min(0).max(1).optional(),
  scale: z.number().min(0.3).max(3).default(1),
  accent: z.enum(ACCENTS).optional(),
  /** frames after scene start before the prop pops in */
  delay: z.number().int().min(0).default(8),
});

export const CodeSchema = z.object({
  title: z.string().max(40).optional(),
  lines: z.array(z.string().max(56)).min(1).max(14),
  /** 0-based line numbers to emphasise */
  highlight: z.array(z.number().int().min(0)).default([]),
});

export const QuizSchema = z.object({
  question: z.string().max(90),
  options: z.array(z.string().max(60)).min(2).max(4),
  /** index into options */
  answer: z.number().int().min(0),
  /** fraction of the scene at which the answer is revealed (viewer "pause and think" time before it) */
  revealAt: z.number().min(0.3).max(0.95).default(0.6),
});

export const ContainerSchema = z.object({
  label: z.string().max(40),
  beans: z.array(z.string().max(24)).min(1).max(8),
});

export const StepsSchema = z.object({
  items: z.array(z.string().max(48)).min(2).max(8),
  /** 0-based step currently being discussed; earlier steps show as done */
  current: z.number().int().min(0).default(0),
});


// ── Extra panels (all draw in the same right-hand PANEL area as code/quiz/container/steps) ──

/** Side-by-side cards: "versus" for options, "beforeAfter" for a transformation. */
export const CompareSchema = z.object({
  mode: z.enum(["versus", "beforeAfter"]).default("versus"),
  cards: z.array(z.object({
    title: z.string().max(28),
    points: z.array(z.string().max(40)).max(4).default([]),
    /** mark the recommended option */
    winner: z.boolean().default(false),
  })).min(2).max(3),
});

/** Architecture / request flow: a packet travels through the nodes. */
export const FlowSchema = z.object({
  nodes: z.array(z.string().max(24)).min(2).max(5),
  /** node the packet travels to and stays on. Omit: the packet bounces end to end (request / response). */
  active: z.number().int().min(0).optional(),
  /** label on the travelling packet, e.g. "GET /users" */
  packet: z.string().max(20).optional(),
});

export const TerminalSchema = z.object({
  title: z.string().max(30).optional(),
  /** lines starting with "$ " are typed out as commands; other lines are output */
  lines: z.array(z.string().max(64)).min(1).max(10),
});

export const BrowserSchema = z.object({
  url: z.string().max(48),
  /** "page" renders a heading + rows, "json" renders an API response */
  kind: z.enum(["page", "json"]).default("page"),
  heading: z.string().max(40).optional(),
  lines: z.array(z.string().max(44)).min(1).max(8),
});

/** Big animated numbers (count up from 0 or `from`). */
export const CounterSchema = z.object({
  items: z.array(z.object({
    value: z.number(),
    from: z.number().default(0),
    prefix: z.string().max(4).default(""),
    suffix: z.string().max(10).default(""),
    label: z.string().max(26),
  })).min(1).max(3),
  decimals: z.number().int().min(0).max(2).default(0),
});

export const ChartSchema = z.object({
  kind: z.enum(["bar", "line"]).default("bar"),
  title: z.string().max(40).optional(),
  labels: z.array(z.string().max(14)).min(2).max(6),
  values: z.array(z.number()).min(2).max(6),
  unit: z.string().max(8).default(""),
  /** index of the bar / point to emphasise */
  highlight: z.number().int().min(0).optional(),
});

export const ProgressSchema = z.object({
  items: z.array(z.object({ label: z.string().max(28), value: z.number().min(0).max(100) })).min(1).max(5),
});

/** Database table (a query result). */
export const TableSchema = z.object({
  name: z.string().max(30).optional(),
  columns: z.array(z.string().max(14)).min(2).max(5),
  rows: z.array(z.array(z.string().max(18))).min(1).max(5),
  highlightRow: z.number().int().min(0).optional(),
});

/** Error / success / warning state. */
export const AlertSchema = z.object({
  kind: z.enum(["error", "success", "warning"]),
  title: z.string().max(40),
  detail: z.string().max(90).optional(),
});


/**
 * Free-form diagram drawn from a small shape language (an AI "draws" the visual for concepts no
 * ready-made panel fits). Coordinates are in panel space: x 0..1300, y 0..700. Shapes appear in
 * order (or by `step`), lines draw themselves on. Deliberately NOT raw SVG: only these primitives
 * with validated numbers and colour tokens can reach the renderer.
 */
const ShapeColor = z.string().regex(/^(ink|accent|red|green|blue|gold|faint|bg|white|#[0-9a-fA-F]{6})$/);
const ShapeBase = {
  /** reveal order; shapes with the same step appear together. Default: position in the list. */
  step: z.number().int().min(0).max(40).optional(),
  fill: ShapeColor.optional(),
  stroke: ShapeColor.optional(),
  sw: z.number().min(1).max(16).optional(),
};
const X = z.number().min(-100).max(1400);
const Y = z.number().min(-100).max(800);
export const ShapeSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("rect"), x: X, y: Y, w: z.number().min(1).max(1400), h: z.number().min(1).max(800), rx: z.number().min(0).max(200).optional(), ...ShapeBase }),
  z.object({ t: z.literal("circle"), cx: X, cy: Y, r: z.number().min(1).max(500), ...ShapeBase }),
  z.object({ t: z.literal("line"), x1: X, y1: Y, x2: X, y2: Y, arrow: z.boolean().optional(), dash: z.boolean().optional(), ...ShapeBase }),
  z.object({ t: z.literal("path"), d: z.string().max(400).regex(/^[MLHVCSQTAZmlhvcsqtaz0-9 ,.-]+$/), ...ShapeBase }),
  z.object({ t: z.literal("text"), x: X, y: Y, text: z.string().min(1).max(40), size: z.number().min(24).max(96).default(40), anchor: z.enum(["start", "middle", "end"]).default("middle"), ...ShapeBase }),
]);
export const SvgSchema = z.object({
  title: z.string().max(40).optional(),
  shapes: z.array(ShapeSchema).min(2).max(40),
});

/**
 * Illustration composed from the hand-drawn doodle asset library (see doodle/catalog.ts): "a server, a fan and a water
 * drop with arrows between them". Positions are percentages of the illustration card (x 0..100 left to right,
 * y 0..100 top to bottom), `size` is the asset height as a percentage of the card height.
 */
export const SceneItemSchema = z.object({
  asset: z.enum(SCENE_ASSETS),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  size: z.number().min(8).max(90).default(34),
  flip: z.boolean().default(false),
  /** colour of the asset's key part; omit for the asset's own default colours */
  tint: z.enum(SCENE_TINTS).optional(),
  /** hand-lettered caption under the asset */
  label: z.string().max(22).optional(),
});
const Pct = z.number().min(0).max(100);
export const SceneArrowSchema = z.object({
  from: z.tuple([Pct, Pct]),
  to: z.tuple([Pct, Pct]),
  label: z.string().max(20).optional(),
});
export const SceneSchema = z.object({
  background: z.enum(SCENE_BACKGROUNDS).default("paper"),
  items: z.array(SceneItemSchema).min(1).max(8),
  arrows: z.array(SceneArrowSchema).max(6).default([]),
});

/** Every panel key. A scene may use only one. */
export const PANEL_KEYS = [
  "code", "quiz", "container", "steps",
  "compare", "flow", "terminal", "browser", "counter", "chart", "progress", "table", "alert", "svg", "scene",
] as const;

export const StickmanVisualSchema = z.object({
  pose: z.enum(POSES).default("idle"),
  mood: z.enum(MOODS).default("neutral"),
  /**
   * horizontal position of the figure, 0..1 of frame width. Omit for the automatic spot. With a panel it is
   * measured inside the figure's strip and clamped so the figure never touches the panel.
   */
  figureX: z.number().min(0).max(1).optional(),
  /** mirror the figure (and its default spot). Ignored while a panel is shown: the figure then faces the panel. */
  flip: z.boolean().default(false),
  /** which side of the frame a panel takes; the figure stands on the other side. Vertical (9:16): panel is always on top. */
  side: z.enum(["left", "right"]).default("right"),
  /** hide the figure for pure-graphic scenes */
  hideFigure: z.boolean().default(false),
  /** 0.5–1.5; default 1.15, or 0.8 when a panel takes one side (clamped so the figure always fits beside it) */
  figureScale: z.number().min(0.5).max(1.5).optional(),
  /** animated backdrop behind the scene (office, server room, city, ...) */
  setting: z.enum(SETTINGS).default("none"),
  /** small chapter tag in the top-left corner, e.g. "2 · Dependency Injection" */
  chapter: z.string().max(40).optional(),
  code: CodeSchema.optional(),
  quiz: QuizSchema.optional(),
  container: ContainerSchema.optional(),
  steps: StepsSchema.optional(),
  compare: CompareSchema.optional(),
  flow: FlowSchema.optional(),
  terminal: TerminalSchema.optional(),
  browser: BrowserSchema.optional(),
  counter: CounterSchema.optional(),
  chart: ChartSchema.optional(),
  progress: ProgressSchema.optional(),
  table: TableSchema.optional(),
  alert: AlertSchema.optional(),
  svg: SvgSchema.optional(),
  scene: SceneSchema.optional(),
  props: z.array(PropSchema).default([]),
  title: z.string().max(60).optional(),
  callouts: z.array(z.string().max(48)).max(4).default([]),
  camera: z.enum(["none", "push", "pull", "pan-left", "pan-right"]).default("none"),
  // "auto" (default) rotates slide / zoom / iris / wipe by scene so consecutive scenes never feel the same; "cut" is a hard cut.
  // not an animation: a per-scene setting that StickmanScene drives from useCurrentFrame()
  // eslint-disable-next-line @remotion/non-pure-animation
  transition: z.enum(["auto", "cut", "wipe", "slide", "zoom", "iris"]).default("auto"),
  accent: z.enum(ACCENTS).default("blue"),
  /** Emotion SFX: "auto" (default) plays the mood's sound when the mood changes from the previous scene. */
  sfx: z.enum(["auto", "none", ...SFX_NAMES]).default("auto"),
  /** frames after scene start before the SFX plays */
  sfxDelay: z.number().int().min(0).default(0),
  /** where the eyes look: "auto" = lively saccades */
  look: z.enum(["auto", "camera", "left", "right", "up", "down"]).default("auto"),
  /** turn off the mood overlay (tint / flash / confetti) and body motion */
  calm: z.boolean().default(false),
});

export type CodeSpec = z.infer<typeof CodeSchema>;
export type QuizSpec = z.infer<typeof QuizSchema>;
export type ContainerSpec = z.infer<typeof ContainerSchema>;
export type StepsSpec = z.infer<typeof StepsSchema>;
export type CompareSpec = z.infer<typeof CompareSchema>;
export type FlowSpec = z.infer<typeof FlowSchema>;
export type TerminalSpec = z.infer<typeof TerminalSchema>;
export type BrowserSpec = z.infer<typeof BrowserSchema>;
export type CounterSpec = z.infer<typeof CounterSchema>;
export type ChartSpec = z.infer<typeof ChartSchema>;
export type ProgressSpec = z.infer<typeof ProgressSchema>;
export type TableSpec = z.infer<typeof TableSchema>;
export type AlertSpec = z.infer<typeof AlertSchema>;
export type SvgSpec = z.infer<typeof SvgSchema>;
export type SceneSpec = z.infer<typeof SceneSchema>;
export type Shape = z.infer<typeof ShapeSchema>;
export type StickmanVisual = z.infer<typeof StickmanVisualSchema>;
export type PoseName = (typeof POSES)[number];
export type SfxName = (typeof SFX_NAMES)[number];
export type Mood = (typeof MOODS)[number];
export type PropType = (typeof PROP_TYPES)[number];
export type AccentName = (typeof ACCENTS)[number];

/** Problems (human readable) in every scene's `visual` block. */
export function validateStickmanScenes(scenes: { id: string; visual?: unknown }[]): string[] {
  const problems: string[] = [];
  for (const s of scenes) {
    const r = StickmanVisualSchema.safeParse(s.visual ?? {});
    if (!r.success) {
      for (const i of r.error.issues) problems.push(`scene ${s.id} visual.${i.path.join(".")}: ${i.message}`);
      continue;
    }
    const v = r.data;
    if (v.quiz && v.quiz.answer >= v.quiz.options.length) problems.push(`scene ${s.id} visual.quiz.answer: index out of range`);
    if (v.steps && v.steps.current >= v.steps.items.length) problems.push(`scene ${s.id} visual.steps.current: index out of range`);
    if (v.code && v.code.highlight.some((h) => h >= v.code!.lines.length)) problems.push(`scene ${s.id} visual.code.highlight: line out of range`);
    if (PANEL_KEYS.filter((k) => v[k]).length > 1) problems.push(`scene ${s.id}: use only one panel (${PANEL_KEYS.join(" / ")}) per scene`);
    if (v.chart && v.chart.labels.length !== v.chart.values.length) problems.push(`scene ${s.id} visual.chart: labels and values must have the same length`);
    if (v.chart?.highlight !== undefined && v.chart.highlight >= v.chart.values.length) problems.push(`scene ${s.id} visual.chart.highlight: index out of range`);
    if (v.flow?.active !== undefined && v.flow.active >= v.flow.nodes.length) problems.push(`scene ${s.id} visual.flow.active: index out of range`);
    if (v.table && v.table.rows.some((r) => r.length !== v.table!.columns.length)) problems.push(`scene ${s.id} visual.table: every row needs ${v.table.columns.length} cells`);
    if (v.table?.highlightRow !== undefined && v.table.highlightRow >= v.table.rows.length) problems.push(`scene ${s.id} visual.table.highlightRow: index out of range`);
  }
  return problems;
}
