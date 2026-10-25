/**
 * Sounds that come from what the animation DOES, not from what the narration says: a boy walking in makes footsteps for exactly the
 * frames he walks, a jump whooshes and lands, a sleeper breathes, a held phone gets tapped. Pure (no React) and a mirror of the
 * timing in story/StoryStage.tsx (entrance walk length, act sequence), so the sounds land on the picture.
 */
import { FOLEY_GAIN, type FoleyName } from "./sounds";
import type { StorySpec } from "./schema";

export interface ActionCue {
  /** frames after the start of the scene */
  frame: number;
  name: FoleyName;
  volume: number;
  /** stop after this many seconds (a long sample cut to the length of the action) */
  seconds?: number;
}

const INDOOR = new Set(["home", "room_night", "hospital", "palace", "temple", "office"]);
const GRASS = new Set(["forest", "village", "farm", "river", "mountain", "beach", "cave"]);

/** The floor under the people decides which footsteps play. */
export function stepSound(bg: string): FoleyName {
  if (INDOOR.has(bg)) return "footsteps-wood";
  if (GRASS.has(bg)) return "footsteps-grass";
  return "footsteps";
}

/** Stage width the people's x (0..100) is measured against. */
export const stageWidth = (vertical: boolean) => (vertical ? 1080 : 1920);

/** Same walk length as the stage: a long way takes longer than a step (14..70 frames). */
export function walkFrames(distPx: number): number {
  return Math.max(14, Math.min(70, Math.round(distPx / 15)));
}

export function planActionSounds(story: StorySpec, durationFrames: number, opts: { w: number; fps?: number }): ActionCue[] {
  const fps = opts.fps ?? 30;
  const sec = (s: number) => Math.round(s * fps);
  const cues: ActionCue[] = [];
  const add = (frame: number, name: FoleyName, volume: number = FOLEY_GAIN[name], seconds?: number) => {
    if (frame >= durationFrames - 2) return;
    cues.push({ frame: Math.max(0, Math.round(frame)), name, volume, ...(seconds ? { seconds } : {}) });
  };

  for (const c of story.chars) {
    const stays = story.cont && c.fromX !== undefined;
    const startPx = stays ? (c.fromX! / 100) * opts.w : c.x < 50 ? -opts.w * 0.2 : opts.w * 1.2;
    const dist = Math.abs((c.x / 100) * opts.w - startPx);
    const travel = dist > 30 && !(story.cont && c.fromX === undefined);
    const moveFrames = travel ? walkFrames(dist) : 0;
    const running = travel && dist / Math.max(1, moveFrames) > 22;
    const floor = stepSound(story.bg);

    if (travel) add(c.delay, running ? "run" : floor, undefined, moveFrames / fps + 0.1);

    const acts = c.acts && c.acts.length ? c.acts : [{ at: 0, pose: c.pose }];
    const act0 = Math.max(0, moveFrames - 2);
    const span = Math.max(20, durationFrames - act0);
    acts.forEach((a, j) => {
      const start = c.delay + act0 + a.at * span;
      const end = j + 1 < acts.length ? c.delay + act0 + acts[j + 1].at * span : durationFrames;
      const len = Math.max(0, end - start);
      switch (a.pose) {
        case "walk": add(start, floor, undefined, Math.min(len / fps, 4.4)); break;
        case "run": add(start, "run", undefined, Math.min(len / fps, 3.6)); break;
        case "dance": add(start, floor, 0.3, Math.min(len / fps, 4.4)); break;
        case "fight": [0.2, 0.9, 1.6].forEach((t, k) => start + sec(t) < end && add(start + sec(t), k % 2 ? "thud" : "punch", 0.5)); break;
        case "jump": add(start, "whoosh", 0.3); add(start + sec(0.55), "thud", 0.4); break;
        case "sleep": add(start + 6, "breath", undefined, len / fps); add(start + sec(0.3), "rustle", 0.3); break;
        case "hug": case "give": case "bow": add(start + sec(0.2), "cloth", 0.4); break;
        case "cry": add(start + sec(0.3), "sigh", 0.35); break;
        case "tired": add(start + sec(0.5), "sigh", 0.3); break;
        case "scared": case "struggle": add(start, "heartbeat", undefined, Math.min(len / fps, 5)); if (a.pose === "struggle") add(start + sec(0.2), "rustle", 0.35); break;
        case "push": case "carry": add(start + sec(0.2), "rustle", 0.4); add(start + sec(1.2), "thud", 0.4); break;
        default: break;
      }
    });

    // what is in the hand
    const handAt = c.delay + Math.max(sec(0.6), act0 + 6);
    if (c.holds === "phone") add(handAt, "click", 0.4);
    else if (c.holds === "book") add(handAt + sec(0.2), "book-flip");
    else if (c.holds === "letter") add(handAt, "cloth", 0.35);
    if (c.react === "laugh") add(c.delay + 4, "laughter", 0.3, 2.5);
    if (c.mood === "scared" && !acts.some((a) => a.pose === "scared" || a.pose === "struggle")) add(c.delay + 10, "heartbeat", 0.35, 4);
  }

  // props that make a noise of their own
  for (const p of story.props) {
    const at = p.delay + 2;
    switch (p.type) {
      case "door": add(at, "door-open"); break;
      case "clock": add(at, "clock-tick", 0.3, durationFrames / fps); break;
      case "bell": add(at + 4, "bell", 0.4); break;
      case "phone": add(at, "phone-buzz"); break;
      case "ball": if (p.anim === "bounce") add(at, "ball-bounce"); break;
      case "cricket": add(at + sec(0.6), "bat-hit"); add(at + sec(2), "bat-hit", 0.5); break;
      default: break;
    }
  }

  // two cues of one sound within a quarter second are one sound
  const seen = new Map<string, number>();
  return cues
    .sort((a, b) => a.frame - b.frame)
    .filter((q) => {
      const last = seen.get(q.name);
      if (last !== undefined && q.frame - last < sec(0.25)) return false;
      seen.set(q.name, q.frame);
      return true;
    })
    .slice(0, 16);
}
