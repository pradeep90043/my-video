/**
 * Pure timeline maths for the stickman composition: scene overlaps for transitions,
 * SFX events, speech windows (music ducking), motion-blur windows and caption words.
 * No React here so scripts can reuse it.
 */
import { MOOD_SFX, StickmanVisualSchema, type Mood, type PoseName, type SfxName, type StickmanVisual, type TransitionName } from "../schema";

export interface SceneInput {
  id: string;
  text: string;
  startFrame?: number;
  durationFrames?: number;
  duration?: number;
  pauseBefore?: number;
  pauseAfter?: number;
  visual?: unknown;
  /** per-word timings from edge-tts, seconds relative to the start of the speech */
  words?: { w: string; s: number; d: number }[];
}

export interface TimelineScene {
  scene: SceneInput;
  visual: StickmanVisual;
  from: number;
  /** nominal duration (what the narration needs) */
  duration: number;
  /** duration including the overlap that the *next* transition eats */
  seqDuration: number;
  /** transition into the next scene */
  out?: { type: Exclude<TransitionName, "auto" | "cut">; frames: number; index: number };
  prevPose: PoseName;
  prevMood?: Mood;
  speakFrom: number;
  speakFrames?: number;
  /** [start, end) scene-relative frames in which a word is actually being spoken (undefined: no word timings) */
  talkRanges?: [number, number][];
  leak: boolean;
}

export interface SfxEvent {
  frame: number;
  name: SfxName | "text-pop" | "text-whoosh";
  volume: number;
}

export interface WordAt {
  text: string;
  startFrame: number;
  endFrame: number;
}

const OVERLAP = 14;
const AUTO_STRONG: Exclude<TransitionName, "auto" | "cut">[] = ["flip", "clock"];
const AUTO_SOFT: Exclude<TransitionName, "auto" | "cut">[] = ["slide", "fade", "slide", "iris"];

export interface Timeline {
  scenes: TimelineScene[];
  sfx: SfxEvent[];
  /** [start, end) frames that contain narration */
  speech: [number, number][];
  /** [start, end) frames in which a transition is on screen (motion-blur candidates) */
  blurWindows: [number, number][];
  words: WordAt[][];
}

/** Where the figure stands, as a 0..1 fraction of frame width (mirroring applied). */
export function figureFraction(v: StickmanVisual, vertical: boolean): number {
  const hasPanel = Boolean(v.code || v.quiz || v.container || v.steps);
  const frac = hasPanel && v.figureX === 0.3 ? 0.14 : vertical && v.figureX === 0.3 ? 0.5 : v.figureX;
  return v.flip ? 1 - frac : frac;
}

export function buildTimeline(scenes: SceneInput[], fps: number, opts: { transitions?: boolean; vertical?: boolean } = {}): Timeline {
  const useTransitions = opts.transitions !== false;
  const parsed = scenes.map((s) => ({ scene: s, visual: StickmanVisualSchema.parse(s.visual ?? {}) }));
  const out: TimelineScene[] = [];
  const sfx: SfxEvent[] = [];
  const speech: [number, number][] = [];
  const blurWindows: [number, number][] = [];
  const words: WordAt[][] = [];

  let prevPose: PoseName = "idle";
  let prevMood: Mood | undefined;
  let autoStrong = 0;
  let autoSoft = 0;

  parsed.forEach(({ scene, visual }, i) => {
    const from = scene.startFrame ?? 0;
    const duration = scene.durationFrames ?? 150;
    const speakFrom = Math.round((scene.pauseBefore ?? 0) * fps);
    const speakFrames = scene.duration !== undefined ? Math.round(scene.duration * fps) : undefined;
    const next = parsed[i + 1];

    let outT: TimelineScene["out"];
    if (next && useTransitions) {
      const want = next.visual.transition;
      const nextDuration = next.scene.durationFrames ?? 150;
      const frames = Math.min(OVERLAP, Math.floor(Math.min(duration, nextDuration) / 2));
      if (want !== "cut" && frames >= 4) {
        let type: Exclude<TransitionName, "auto" | "cut">;
        if (want !== "auto") type = want;
        else if (next.visual.chapter && next.visual.chapter !== visual.chapter) type = "wipe";
        else if (next.visual.mood !== visual.mood) type = AUTO_STRONG[autoStrong++ % AUTO_STRONG.length];
        else type = AUTO_SOFT[autoSoft++ % AUTO_SOFT.length];
        outT = { type, frames: type === "fade" ? Math.min(frames, 10) : frames, index: i };
      }
    }

    const moodChanged = prevMood !== undefined && prevMood !== visual.mood;
    const speechStart0 = from + speakFrom;
    const speechLen0 = speakFrames ?? Math.max(1, duration - speakFrom);
    const thisWords = sceneWords(scene, speechStart0, speechLen0, fps);
    out.push({
      scene, visual, from, duration, seqDuration: duration + (outT?.frames ?? 0), out: outT,
      prevPose, prevMood, speakFrom, speakFrames, talkRanges: talkRanges(scene, speakFrom, fps),
      leak: visual.leak ?? (moodChanged && visual.mood === "excited"),
    });

    // SFX
    const name: SfxName | undefined =
      visual.sfx === "auto" ? (moodChanged ? (MOOD_SFX[visual.mood] as SfxName | undefined) : undefined) : visual.sfx === "none" ? undefined : visual.sfx;
    if (name) sfx.push({ frame: from + visual.sfxDelay, name, volume: 0.5 });
    if (visual.title) sfx.push({ frame: from + 4, name: "text-pop", volume: 0.25 });
    if (outT) {
      sfx.push({ frame: from + duration, name: "text-whoosh", volume: 0.28 });
      blurWindows.push([from + duration, from + duration + outT.frames]);
    }

    // Narration window + word timings (absolute frames)
    const speechStart = from + speakFrom;
    const speechLen = speakFrames ?? Math.max(1, duration - speakFrom);
    speech.push([speechStart, speechStart + speechLen]);
    words.push(thisWords);
    void speechLen;

    prevPose = visual.pose;
    prevMood = visual.mood;
  });

  return { scenes: out, sfx, speech, blurWindows, words };
}

/** Mouth should only move while a word is sounding (edge-tts pads pauses and the tail with silence). */
function talkRanges(scene: SceneInput, speakFrom: number, fps: number): [number, number][] | undefined {
  if (!scene.words?.length) return undefined;
  const out: [number, number][] = [];
  for (const w of scene.words) {
    const a = speakFrom + Math.round(w.s * fps) - 1;
    const b = speakFrom + Math.round((w.s + w.d) * fps) + 2;
    const last = out[out.length - 1];
    if (last && a <= last[1] + 2) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

function sceneWords(scene: SceneInput, speechStart: number, speechLen: number, fps: number): WordAt[] {
  if (scene.words?.length) {
    return scene.words.map((w) => ({
      text: w.w,
      startFrame: speechStart + Math.round(w.s * fps),
      endFrame: speechStart + Math.max(Math.round((w.s + w.d) * fps), Math.round(w.s * fps) + 1),
    }));
  }
  // Fallback: spread the words over the scene in proportion to their length.
  const toks = scene.text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const total = toks.reduce((n, t) => n + t.length + 1, 0) || 1;
  let cursor = 0;
  return toks.map((t) => {
    const startFrame = speechStart + Math.round((cursor / total) * speechLen);
    cursor += t.length + 1;
    return { text: t, startFrame, endFrame: Math.max(startFrame + 1, speechStart + Math.round((cursor / total) * speechLen)) };
  });
}

/** Music gain per frame: 1 normally, `duck` while someone is speaking, with short ramps. */
export function buildDuckEnvelope(speech: [number, number][], totalFrames: number, duck = 0.45, ramp = 8): Float32Array {
  const env = new Float32Array(totalFrames).fill(1);
  for (const [a, b] of speech) {
    for (let f = Math.max(0, a - ramp); f < Math.min(totalFrames, b + ramp); f++) {
      const t = f < a ? 1 - (a - f) / ramp : f >= b ? 1 - (f - b + 1) / ramp : 1;
      env[f] = Math.min(env[f], 1 - (1 - duck) * Math.max(0, Math.min(1, t)));
    }
  }
  return env;
}
