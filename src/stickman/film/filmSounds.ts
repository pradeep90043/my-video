/**
 * Sounds that come from what the film layers DO: the alarm rings until it is stopped, a screen tap clicks, a calendar mark squeaks as
 * it is drawn, a calendar crumples, keys tap while text is typed, a box lands on the counter. Pure, and in the shot's own frames,
 * so the sound lands on the picture. Mirrors actionSounds.ts for story scenes.
 */
import { FOLEY_GAIN, FOLEY_NAMES, type FoleyName } from "../sounds";
import { endFrame, type Anim } from "./anim";
import type { FilmSpec, FilmLayer } from "./schema";
import type { ActionCue } from "../actionSounds";

const floorFor = (env: string | undefined): FoleyName =>
  env?.startsWith("shop") || env?.startsWith("home") || env?.startsWith("desk") ? "footsteps-wood" : env === "hill-day" ? "footsteps-grass" : "footsteps";

const startOf = (a: Anim | undefined): number => (a && typeof a === "object" && "at" in a ? a.at ?? 0 : a && typeof a === "object" && "keys" in a ? a.keys[0][0] : 0);

export function planFilmSounds(film: FilmSpec, durationFrames: number, opts: { fps?: number } = {}): ActionCue[] {
  const fps = opts.fps ?? 30;
  const cues: ActionCue[] = [];
  const add = (frame: number, name: FoleyName, volume: number = FOLEY_GAIN[name], seconds?: number) => {
    if (frame >= durationFrames - 2) return;
    cues.push({ frame: Math.max(0, Math.round(frame)), name, volume, ...(seconds ? { seconds } : {}) });
  };
  const env = film.layers.find((l): l is Extract<FilmLayer, { t: "env" }> => l.t === "env")?.kind;
  const span = (l: { at?: number; until?: number }) => ((l.until ?? durationFrames) - (l.at ?? 0)) / fps;

  for (const l of film.layers) {
    const at = "at" in l ? l.at ?? 0 : 0;
    switch (l.t) {
      case "person":
        if (l.pose === "walk" || l.to === "walk") add(at + (l.pose === "walk" ? 0 : l.poseAt), floorFor(env), undefined, Math.min(span(l), 4.4));
        break;
      case "phone": {
        if (l.ring && l.mode === "alarm") add(at, "phone-alarm", undefined, Math.min(l.pressAt !== undefined ? (l.pressAt - at) / fps : 2.4, 2.4));
        if (l.pressAt !== undefined) add(l.pressAt, "click", 0.55);
        if (l.mode === "keyboard" && l.text) add(l.typeFrom, "typing-soft", 0.5, Math.min((l.text.length * l.typeEvery) / fps + 0.2, 6));
        break;
      }
      case "calendar": {
        for (const m of l.marks) add(m.at, "marker-write", 0.4);
        const cr = l.crumple as Anim;
        if (typeof cr === "object") add(startOf(cr) + 2, "paper-crumple", undefined, Math.max(0.6, (endFrame(cr) - startOf(cr)) / fps));
        break;
      }
      case "screen":
        if (l.typeFrom !== undefined) add(l.typeAt, "typing-soft", 0.5, Math.min((l.title.length * l.typeEvery) / fps + 0.2, 6));
        if (typeof l.cursorAt === "number") add(l.cursorAt + 30, "click", 0.55);
        break;
      case "poster":
        if (l.writeAt !== undefined) for (let t = 0; t < l.writeDur; t += 20) add(l.writeAt + t, "marker-write", 0.45);
        break;
      case "hand":
        if (l.kind === "grab" || l.to === "grab") add(at + 10, "rustle", 0.4);
        if (l.kind === "pinch") add(at + 10, "cloth", 0.4);
        break;
      case "books":
        if (at > 0 && l.kind !== "crumpled") add(at, "thud", 0.4);
        if (typeof l.lid === "object") add(endFrame(l.lid), "thud", 0.3);
        break;
      default: break;
    }
  }

  // what the director staged (footsteps for a walk, a chair taking weight, a cup put down...)
  for (const f of film.foley ?? []) if ((FOLEY_NAMES as readonly string[]).includes(f.name)) add(f.at, f.name as FoleyName, f.volume, f.seconds);

  // two cues of one sound within a quarter second are one sound
  const seen = new Map<string, number>();
  return cues
    .sort((a, b) => a.frame - b.frame)
    .filter((c) => {
      const last = seen.get(c.name);
      if (last !== undefined && c.frame - last < Math.round(0.25 * fps)) return false;
      seen.set(c.name, c.frame);
      return true;
    })
    .slice(0, 24);
}
