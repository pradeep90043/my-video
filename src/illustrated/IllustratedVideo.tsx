import React from "react";
import { DEVANAGARI } from "../stickman/fonts";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * The illustrated engine: painted backgrounds and painted, cut-out characters (scripts/illustrated/prepare.py), animated the way 2D
 * mythology channels do it: the camera drifts through the painting, people breathe and sway, walk with a bob, turn and nod their
 * heads (the head is a separate piece cut at the neck), speak with a gentle nod; subtitles at the bottom, a hook title on top.
 */
export interface ActorMeta { w: number; h: number; neck: number; neckX: number; cx: number }
export interface Move { at: number; dur: number; to: number; walk?: boolean }
export interface Actor {
  id: string; src: string; meta: ActorMeta;
  /** height on screen, fraction of the frame height */
  height: number;
  /** feet position: x 0..1 across, ground 0..1 down */
  x: number; ground: number;
  flip?: boolean;
  moves?: Move[];
  /** [from, to] seconds: speaking (the head nods) */
  talks?: [number, number][];
  /** seconds when the head turns to look (degrees) */
  looks?: [number, number][];
  /** appears at (seconds), fading in */
  at?: number;
}
export interface Shot {
  secs: number; bg: string;
  camera?: { from: [number, number, number]; to: [number, number, number] }; // [zoom, x 0..1, y 0..1] centre
  grade?: "day" | "dusk" | "night";
  title?: string;
  subs?: { text: string; at: number; dur: number }[];
  actors: Actor[];
  fx?: "fireflies" | "rays" | "embers" | "rain";
  /** narration for this shot (starts `voiceAt` seconds in) */
  voice?: string; voiceAt?: number;
}
export interface IllustratedSpec { shots: Shot[] }

const FADE = 12;
const GRADE: Record<string, { filter: string; tint: string; o: number }> = {
  day: { filter: "saturate(1.05)", tint: "#fff3d6", o: 0.06 },
  dusk: { filter: "saturate(1.08) brightness(0.95)", tint: "#ff8a3d", o: 0.14 },
  night: { filter: "saturate(0.85) brightness(0.78)", tint: "#2b3f8f", o: 0.22 },
};

const ease = Easing.bezier(0.45, 0, 0.25, 1);
const rnd = (i: number) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

function xAt(a: Actor, t: number): { x: number; walking: number } {
  let x = a.x, walking = 0;
  for (const m of a.moves ?? []) {
    if (t <= m.at) break;
    const k = Math.min(1, (t - m.at) / m.dur);
    const from = x;
    x = from + (m.to - from) * ease(k);
    if (k < 1 && m.walk !== false) walking = Math.min(1, k * 6, (1 - k) * 6);
  }
  return { x, walking };
}

const ActorView: React.FC<{ a: Actor; t: number; W: number; H: number; grade: string; seed: number }> = ({ a, t, W, H, grade, seed }) => {
  const { x, walking } = xAt(a, t);
  const scale = (a.height * H) / a.meta.h;
  const w = a.meta.w * scale, h = a.meta.h * scale;
  const left = x * W - a.meta.cx * scale, top = a.ground * H - h;
  const phase = t * 7.5;
  const bob = walking * Math.abs(Math.sin(phase)) * -0.018 * h;
  const rock = walking * Math.sin(phase) * 2.2 + Math.sin(t * 1.1 + seed) * 0.5;
  const breathe = 1 + Math.sin(t * 2.2 + seed) * 0.006;
  const talking = (a.talks ?? []).some(([f, e]) => t >= f && t < e);
  let head = Math.sin(t * 0.9 + seed) * 1.6 + (talking ? Math.sin(t * 9) * 2.2 + Math.sin(t * 3.7) * 1.2 : 0);
  for (const [at, deg] of a.looks ?? []) if (t >= at) head += deg * interpolate(t - at, [0, 0.5], [0, 1], { extrapolateRight: "clamp", easing: ease }) - (0);
  const show = a.at === undefined ? 1 : interpolate(t - a.at, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const g = GRADE[grade] ?? GRADE.day;
  const src = staticFile(a.src);
  const neckY = a.meta.neck * scale, neckX = a.meta.neckX * scale, overlap = 0.012 * h;
  const img = (clip: string) => <Img src={src} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, clipPath: clip, filter: g.filter }} />;
  return (
    <div style={{ position: "absolute", left, top: top + bob, width: w, height: h, opacity: show, transformOrigin: `${a.meta.cx * scale}px ${h}px`, transform: `scaleX(${a.flip ? -1 : 1}) rotate(${rock}deg)` }}>
      <div style={{ position: "absolute", left: a.meta.cx * scale - w * 0.32, top: h - h * 0.025, width: w * 0.64, height: h * 0.05, borderRadius: "50%", background: "radial-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0) 70%)" }} />
      <div style={{ position: "absolute", inset: 0, transformOrigin: `50% 100%`, transform: `scaleY(${breathe})` }}>
        {img(`inset(${neckY}px 0 0 0)`)}
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${neckX}px ${neckY}px`, transform: `rotate(${head}deg)` }}>
          {img(`inset(0 0 ${h - neckY - overlap}px 0)`)}
        </div>
      </div>
    </div>
  );
};

const Fx: React.FC<{ kind: Shot["fx"]; t: number; W: number; H: number }> = ({ kind, t, W, H }) => {
  if (kind === "fireflies" || kind === "embers") {
    return <AbsoluteFill>{Array.from({ length: 34 }).map((_, i) => {
      const x = (rnd(i) * W + Math.sin(t * 0.6 + i) * 40), y = (rnd(i + 50) * H * 0.85 + Math.cos(t * 0.5 + i * 2) * 30 - (kind === "embers" ? (t * 40 * rnd(i + 9)) % H : 0) + H) % H;
      const o = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.2 + rnd(i + 3)) + i));
      return <div key={i} style={{ position: "absolute", left: x, top: y, width: 7, height: 7, borderRadius: 4, background: kind === "embers" ? "#ffb347" : "#f7ffb0", boxShadow: `0 0 14px 5px ${kind === "embers" ? "rgba(255,150,60,0.6)" : "rgba(230,255,150,0.6)"}`, opacity: o }} />;
    })}</AbsoluteFill>;
  }
  if (kind === "rain") return <AbsoluteFill>{Array.from({ length: 90 }).map((_, i) => {
    const x = rnd(i + 7) * (W + 200) - 100, sp = 900 + rnd(i + 3) * 500, y = ((rnd(i + 11) * H + t * sp) % (H + 120)) - 60;
    return <div key={i} style={{ position: "absolute", left: x, top: y, width: 2, height: 46, background: "rgba(200,215,240,0.45)", transform: "rotate(14deg)" }} />;
  })}</AbsoluteFill>;
  if (kind === "rays") return <AbsoluteFill style={{ background: `linear-gradient(${115 + Math.sin(t * 0.3) * 3}deg, rgba(255,240,190,0.0) 30%, rgba(255,236,170,0.22) 45%, rgba(255,240,190,0.0) 52%, rgba(255,236,170,0.16) 60%, rgba(255,240,190,0) 70%)`, mixBlendMode: "screen" }} />;
  return null;
};

export const ShotView: React.FC<{ shot: Shot; fadeIn?: boolean; fadeOut?: boolean }> = ({ shot, fadeIn = true, fadeOut = true }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps, n = shot.secs * fps;
  const p = ease(Math.min(1, frame / n));
  const cam = shot.camera ?? { from: [1.04, 0.5, 0.5], to: [1.12, 0.52, 0.5] };
  const z = cam.from[0] + (cam.to[0] - cam.from[0]) * p, cx = cam.from[1] + (cam.to[1] - cam.from[1]) * p, cy = cam.from[2] + (cam.to[2] - cam.from[2]) * p;
  const g = GRADE[shot.grade ?? "day"];
  const fade = Math.min(1, fadeIn ? frame / FADE : 1, fadeOut ? (n - frame) / FADE : 1);
  const stage = (depth: number) => `translate(${W / 2}px, ${H / 2}px) scale(${1 + (z - 1) * depth}) translate(${-cx * W}px, ${-cy * H}px)`;
  return (
    <AbsoluteFill style={{ opacity: Math.max(0, fade), backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: stage(0.7), transformOrigin: "0 0" }}>
        <Img src={staticFile(shot.bg)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", filter: g.filter }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: stage(1), transformOrigin: "0 0" }}>
        {shot.actors.map((a, i) => <ActorView key={a.id} a={a} t={t} W={W} H={H} grade={shot.grade ?? "day"} seed={i * 2.3} />)}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: g.tint, opacity: g.o, mixBlendMode: "soft-light" }} />
      <Fx kind={shot.fx} t={t} W={W} H={H} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
      {shot.title && (() => {
        const k = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
        const [l1, ...rest] = shot.title.split("|");
        return (
          <div style={{ position: "absolute", left: 70, top: 60, transform: `rotate(-4deg) scale(${k})`, transformOrigin: "0 50%", fontFamily: `Georgia, ${DEVANAGARI}, serif`, fontWeight: 900, color: "#fff", textShadow: "0 4px 0 #000, 0 0 18px rgba(0,0,0,0.7)", lineHeight: 1.0 }}>
            <div style={{ fontSize: 64 }}>{l1}</div>
            {rest.length > 0 && <div style={{ fontSize: 96, color: "#ffd24a", WebkitTextStroke: "3px #5a2a00" }}>{rest.join(" ")}</div>}
          </div>
        );
      })()}
      {shot.voice && <Sequence from={Math.round((shot.voiceAt ?? 0.4) * fps)}><Audio src={staticFile(shot.voice)} /></Sequence>}
      {(shot.subs ?? []).filter((s) => t >= s.at && t < s.at + s.dur).map((s, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, bottom: 48, textAlign: "center", fontFamily: `${DEVANAGARI}, sans-serif`, fontSize: 40, fontWeight: 600, color: "#fff", textShadow: "0 2px 4px #000, 0 0 12px rgba(0,0,0,0.9)", opacity: interpolate(t - s.at, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }) }}>{s.text}</div>
      ))}
    </AbsoluteFill>
  );
};

export const illustratedFrames = (spec: IllustratedSpec, fps = 30) => spec.shots.reduce((n, s) => n + Math.round(s.secs * fps) - FADE, FADE);

export const IllustratedVideo: React.FC<IllustratedSpec> = (spec) => {
  const { fps } = useVideoConfig();
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {spec.shots.map((s, i) => {
        const d = Math.round(s.secs * fps);
        const el = <Sequence key={i} from={from} durationInFrames={d}><ShotView shot={s} /></Sequence>;
        from += d - FADE;
        return el;
      })}
    </AbsoluteFill>
  );
};


/** A painted scene inside the stickman video (visual.illustrated, written by the server's illustrated.ts), as a Shot. */
export interface SceneShot {
  bg: string; grade?: "day" | "dusk" | "night"; fx?: Shot["fx"]; cont?: boolean;
  actors: { id: string; url: string; meta: ActorMeta; height: number; x: number; ground: number; fromX?: number; flip?: boolean; talking?: boolean; walk?: boolean }[];
}
export function sceneShot(s: SceneShot, secs: number, index: number): Shot {
  // the camera keeps moving through the painting: alternate a push-in and a slow pan, so consecutive beats never repeat the same move
  const k = index % 3;
  const camera: Shot["camera"] = k === 0 ? { from: [1.04, 0.5, 0.52], to: [1.12, 0.5, 0.54] } : k === 1 ? { from: [1.1, 0.44, 0.53], to: [1.1, 0.56, 0.53] } : { from: [1.14, 0.55, 0.54], to: [1.06, 0.5, 0.52] };
  return {
    secs, bg: s.bg, grade: s.grade ?? "day", fx: s.fx, camera,
    actors: s.actors.map((a) => ({
      id: a.id, src: a.url, meta: a.meta, height: a.height, ground: a.ground, flip: a.flip,
      x: a.fromX ?? a.x,
      moves: a.fromX !== undefined ? [{ at: 0.2, dur: Math.max(0.8, secs * 0.7), to: a.x, walk: true }] : a.walk ? [{ at: 0.1, dur: Math.max(0.8, secs * 0.8), to: Math.max(0.08, Math.min(0.92, a.x + (a.flip ? -0.12 : 0.12))), walk: true }] : [],
      talks: a.talking ? [[0.1, secs]] : [],
    })),
  };
}
