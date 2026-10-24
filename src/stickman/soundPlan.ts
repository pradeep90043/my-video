/**
 * Plans the realism sounds for a stickman project: which ambience bed plays over which frames and where each
 * foley one-shot lands. Pure (no React) so the composition, preflight and tests share it.
 * Explicit `visual.ambient` / `visual.foley` win; with `autoSound` the narration's own words fill the gaps.
 */
import { AMBIENT_GAIN, FOLEY_GAIN, detectAmbient, detectFoley, type AmbientName, type FoleyName } from "./sounds";
import { StickmanVisualSchema } from "./schema";

export interface PlanScene {
  text: string;
  startFrame?: number;
  durationFrames?: number;
  pauseBefore?: number;
  visual?: unknown;
  /** per-word timings (seconds from the start of the narration), as stored by the audio step */
  words?: { text: string; start: number; end: number }[];
}

/** A one-shot foley sound. */
export interface FoleyEvent {
  frame: number;
  name: FoleyName;
  volume: number;
  /** hard stop (frames) so footsteps never run on past their scene */
  durationFrames: number;
}

/** An ambience bed looping from `from` to `to` (absolute frames); the component adds the fades. */
export interface AmbientSegment {
  name: AmbientName;
  from: number;
  to: number;
  gain: number;
}

export interface SoundPlan {
  foley: FoleyEvent[];
  ambient: AmbientSegment[];
}

/** Scenes an auto-detected bed keeps playing after the last scene that mentioned it. */
const AUTO_AMBIENT_SCENES = 4;
/** Frames the ambience fades in / out over (also the crossfade between two beds). */
export const AMBIENT_FADE = 20;

/** Gain (0..1) of a bed `f` frames into a segment of `dur` frames: fade in, hold, fade out. */
export function ambientEnvelope(f: number, dur: number, fade = AMBIENT_FADE): number {
  return Math.max(0, Math.min(1, f / fade, (dur - f) / fade));
}

export function planSounds(scenes: PlanScene[], fps: number, opts: { autoSound?: boolean } = {}): SoundPlan {
  const autoSound = opts.autoSound !== false;
  const foley: FoleyEvent[] = [];
  const ambient: AmbientSegment[] = [];
  let bed: { seg: AmbientSegment; auto: boolean; left: number } | undefined;

  scenes.forEach((scene) => {
    const visual = StickmanVisualSchema.parse(scene.visual ?? {});
    const from = scene.startFrame ?? 0;
    const duration = scene.durationFrames ?? 150;
    const speakFrom = Math.round((scene.pauseBefore ?? 0) * fps);
    const sceneEnd = from + duration;

    // Foley: explicit cues win; otherwise the narration's action words ("walked", "knocked", "alarm") add them
    const addFoley = (name: FoleyName, frame: number, volume?: number, seconds?: number) => {
      const stop = Math.max(1, sceneEnd - frame);
      foley.push({ frame, name, volume: volume ?? FOLEY_GAIN[name], durationFrames: seconds ? Math.min(stop, Math.round(seconds * fps)) : stop });
    };
    if (visual.foley.length) {
      for (const f of visual.foley) addFoley(f.name, from + speakFrom + Math.round(f.at * fps), f.volume, f.duration);
    } else if (autoSound) {
      const tokens = scene.words?.length ? scene.words.map((w) => ({ text: w.text, at: w.start })) : spread(scene.text, Math.max(1, duration - speakFrom) / fps);
      for (const c of detectFoley(tokens.map((t) => t.text))) addFoley(c.foley, from + speakFrom + Math.round(tokens[c.wordIndex].at * fps));
    }

    // Ambience: an explicit `ambient` persists until changed; a bed picked from the text lingers a few scenes
    // (a bed the author set explicitly is never replaced by one guessed from the text)
    const wanted = visual.ambient ?? (autoSound && !(bed && !bed.auto) ? detectAmbient(scene.text) : undefined);
    const explicit = visual.ambient !== undefined;
    if (wanted === "none") {
      if (bed) bed.seg.to = from;
      bed = undefined;
    } else if (wanted && wanted !== bed?.seg.name) {
      if (bed) bed.seg.to = from;
      const seg: AmbientSegment = { name: wanted, from, to: sceneEnd, gain: AMBIENT_GAIN[wanted] * visual.ambientVolume };
      ambient.push(seg);
      bed = { seg, auto: !explicit, left: AUTO_AMBIENT_SCENES };
    } else if (bed) {
      if (wanted) { bed.left = AUTO_AMBIENT_SCENES; bed.auto = bed.auto && !explicit; }
      else if (bed.auto && --bed.left <= 0) { bed.seg.to = from; bed = undefined; }
    }
    if (bed) bed.seg.to = sceneEnd;
  });

  return { foley, ambient };
}

/** No word timings: spread the words over `seconds` in proportion to their length. */
function spread(text: string, seconds: number): { text: string; at: number }[] {
  const toks = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const total = toks.reduce((n, t) => n + t.length + 1, 0) || 1;
  let cursor = 0;
  return toks.map((t) => {
    const at = (cursor / total) * seconds;
    cursor += t.length + 1;
    return { text: t, at };
  });
}
