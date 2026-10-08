/**
 * Data contract for stickman videos. A project's video.json has
 *   "template": "stickman", "theme": "light" | "dark"
 * and each scene may carry a `visual` block validated by StickmanVisualSchema.
 * Pure zod (no React) so scripts can validate it too.
 */
import { z } from "zod";

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

export const StickmanVisualSchema = z.object({
  pose: z.enum(POSES).default("idle"),
  mood: z.enum(MOODS).default("neutral"),
  /** horizontal position of the figure, 0..1 of frame width */
  figureX: z.number().min(0).max(1).default(0.3),
  flip: z.boolean().default(false),
  /** hide the figure for pure-graphic scenes */
  hideFigure: z.boolean().default(false),
  /** 0.5–1.5; default 1.15, or 0.8 when a panel (code/quiz/container/steps) takes the right side */
  figureScale: z.number().min(0.5).max(1.5).optional(),
  /** small chapter tag in the top-left corner, e.g. "2 · Dependency Injection" */
  chapter: z.string().max(40).optional(),
  code: CodeSchema.optional(),
  quiz: QuizSchema.optional(),
  container: ContainerSchema.optional(),
  steps: StepsSchema.optional(),
  props: z.array(PropSchema).default([]),
  title: z.string().max(60).optional(),
  callouts: z.array(z.string().max(48)).max(4).default([]),
  camera: z.enum(["none", "push", "pull", "pan-left", "pan-right"]).default("none"),
  // not an animation: a per-scene setting that StickmanScene drives from useCurrentFrame()
  // eslint-disable-next-line @remotion/non-pure-animation
  /** "auto" (default) rotates slide / zoom / iris / wipe by scene so consecutive scenes never feel the same; "cut" is a hard cut. */
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
    if ([v.code, v.quiz, v.container, v.steps].filter(Boolean).length > 1) problems.push(`scene ${s.id}: use only one of code / quiz / container / steps per scene`);
  }
  return problems;
}
