/**
 * Renders one film shot: sorts the layers, runs the camera (zoom + pan, with parallax so the background moves less than the
 * people), applies depth of field, weather and light, and the fades. Everything is a pure function of the frame number.
 */
import React from "react";
import { EnvBack, EnvFront, FilmDefs } from "./env";
import { Hand } from "./hand";
import { Person } from "./person";
import { resolveAvatar } from "./avatar";
import { PropArt, PROPS } from "./props";
import { carryPoint, personState, stepAt, talkingAt } from "./rig";
import { Books, Calendar, Caption, Phone, Poster, Screen, Sign } from "./ui";
import { val } from "./anim";
import { overscan, shakeAt } from "./camfx";
import type { FilmLayer, FilmSpec } from "./schema";

const W = 1920, H = 1080;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const rnd = (seed: number) => { let s = Math.imul(seed + 1, 2654435761) >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };

/** Draw order when a layer does not set `z`. */
const DEFAULT_Z: Record<string, number> = { env: 0, person: 10, prop: 20, poster: 12, sign: 16, books: 20, calendar: 20, phone: 20, screen: 20, hand: 35, fx: 40, caption: 60 };

const Fx: React.FC<{ layer: Extract<FilmLayer, { t: "fx" }>; frame: number }> = ({ layer, frame }) => {
  const a = layer.amount;
  switch (layer.kind) {
    case "rain": {
      const n = Math.round(110 * a);
      return (
        <g stroke="rgba(190,210,235,0.38)" strokeWidth={2} strokeLinecap="round">
          {Array.from({ length: n }).map((_, i) => {
            const r = rnd(i + 3);
            const x = r() * (W + 200), sp = 30 + r() * 14, y = ((r() * (H + 200) + frame * sp) % (H + 200)) - 100;
            return <line key={i} x1={x} y1={y} x2={x - 12} y2={y + 46} />;
          })}
        </g>
      );
    }
    case "dust":
      return (
        <g>{Array.from({ length: Math.round(30 * a) }).map((_, i) => {
          const r = rnd(i + 90);
          return <circle key={i} cx={(r() * W + Math.sin((frame + i * 25) / 80) * 50 + W) % W} cy={((r() * H - frame * (0.25 + r() * 0.3)) % H + H) % H} r={1.5 + r() * 2.5} fill="#fff" opacity={0.2 + r() * 0.35} />;
        })}</g>
      );
    case "vignette": return <rect width={W} height={H} fill="url(#fl-vig)" opacity={a} />;
    case "tint": return <rect width={W} height={H} fill={layer.color ?? "#0a1020"} opacity={a} style={{ mixBlendMode: "multiply" }} />;
    case "glow": return <ellipse cx={layer.x} cy={layer.y} rx={480 * a} ry={380 * a} fill={layer.color === "cool" ? "url(#fl-cool)" : "url(#fl-warm)"} style={{ mixBlendMode: "screen" }} />;
    case "grain": return <rect width={W} height={H} filter="url(#fl-grain)" opacity={0.08 * a} style={{ mixBlendMode: "overlay" }} />;
    case "leaves":
      return (
        <g>{Array.from({ length: Math.round(16 * a) }).map((_, i) => {
          const r = rnd(i + 200);
          const y = ((r() * H + frame * (2 + r() * 2)) % (H + 80)) - 40, x = r() * W + Math.sin((frame + i * 30) / 40) * 40;
          return <ellipse key={i} cx={x} cy={y} rx={14} ry={7} fill={["#c25e2e", "#d08a3c", "#a8482a"][i % 3]} opacity={0.85} transform={`rotate(${(frame * 3 + i * 40) % 360} ${x} ${y})`} />;
        })}</g>
      );
    case "sunrays":
      return (
        <g style={{ mixBlendMode: "screen" }} opacity={0.5 * a}>
          {[0, 1, 2, 3].map((i) => <polygon key={i} points={`${1500 + i * 90},0 ${1600 + i * 90},0 ${700 + i * 160 + Math.sin(frame / 60 + i) * 30},${H} ${520 + i * 160},${H}`} fill="#fff3cf" opacity={0.10} />)}
        </g>
      );
    default: return null;
  }
};

interface Props { film: FilmSpec; frame: number; durationFrames: number }

export const FilmStage: React.FC<Props> = ({ film, frame, durationFrames }) => {
  const envLayer = film.layers.find((l) => l.t === "env");
  const grade = envLayer && envLayer.t === "env" ? envLayer.grade : "day";
  const zoom = val(film.cam.zoom, frame, 1), cx = val(film.cam.x, frame, 960), cy = val(film.cam.y, frame, 540);
  // camera feel (handheld drift, impact kicks, zoom pulses), with just enough overscan never to show past the set
  const fx = shakeAt(film.cam.shakes, frame), over = film.cam.shakes?.length ? overscan(fx) : 1;
  const camT = (d: number) => {
    const z = (1 + (zoom - 1) * d) * fx.z * over, px = 960 + (cx - 960) * d, py = 540 + (cy - 540) * d;
    return `translate(${960 + fx.x},${540 + fx.y}) rotate(${fx.r}) scale(${z}) translate(${-px},${-py})`;
  };
  // an env layer fans out into a back and a front pass
  type Item = { z: number; key: string; layer: FilmLayer; part?: "back" | "front" };
  const items: Item[] = [];
  film.layers.forEach((layer, i) => {
    if (layer.t === "env") {
      items.push({ z: layer.z ?? 0, key: `e${i}b`, layer, part: "back" }, { z: (layer.z ?? 0) + 15, key: `e${i}f`, layer, part: "front" });
    } else {
      const zs = layer.t === "person" || layer.t === "prop" ? layer.zs : undefined;
      const z = (zs ? stepAt(zs, frame, zs[0]?.[1] ?? 20).v : undefined) ?? ("z" in layer ? layer.z : undefined) ?? (layer.t === "person" && layer.fg ? 25 : layer.t === "hand" && !layer.over ? 18 : DEFAULT_Z[layer.t] ?? 20);
      items.push({ z, key: `l${i}`, layer });
    }
  });
  items.sort((a, b) => a.z - b.z || a.key.localeCompare(b.key, undefined, { numeric: true }));

  const visible = (l: { at?: number; until?: number }) => frame >= (l.at ?? 0) && (l.until === undefined || frame < l.until);
  const fade = (l: { at?: number; until?: number }) => Math.min(clamp01((frame - (l.at ?? 0)) / 4 + (l.at ? 0 : 1)), l.until === undefined ? 1 : clamp01((l.until - frame) / 4));

  const renderItem = (it: Item) => {
    const l = it.layer;
    if (!visible(l as { at?: number; until?: number })) return null;
    if (l.t === "caption") return null; // screen space, drawn last
    if (l.t === "env") {
      const blur = val(l.blur, frame, 0);
      return (
        <g key={it.key} transform={camT(l.depth)} style={blur > 0 ? { filter: `blur(${blur}px)` } : undefined}>
          {it.part === "back" ? <EnvBack kind={l.kind} grade={l.grade} t={frame} wall={l.wall} floor={l.floor} /> : <EnvFront kind={l.kind} t={frame} />}
        </g>
      );
    }
    if (l.t === "fx") return <g key={it.key}><Fx layer={l} frame={frame} /></g>;
    const x = val(l.x, frame, 960), y = val(l.y, frame, 540), s = val(l.s, frame, 1), r = val(l.r, frame, 0), o = val(l.o, frame, 1) * fade(l), blur = val(l.blur, frame, 0);
    const wrap = (child: React.ReactNode, flipX = 1) => (
      <g key={it.key} transform={camT(1)} opacity={o} style={blur > 0 ? { filter: `blur(${blur}px)` } : undefined}>
        <g transform={`translate(${x},${y}) rotate(${r}) scale(${s * flipX},${s})`}>{child}</g>
      </g>
    );
    switch (l.t) {
      case "person": {
        const st = personState(l, Number(it.key.slice(1)), frame);
        const p = st.place;
        return (
          <g key={it.key} transform={camT(1)} opacity={o} style={blur > 0 ? { filter: `blur(${blur}px)` } : undefined}>
            <g transform={`translate(${p.x},${p.y}) rotate(${p.r}) scale(${p.s * (p.flip ? -1 : 1) * (p.sx ?? 1)},${p.s})`}>
              <Person avatar={resolveAvatar(l.who, l.avatar, l.shirt)} pose={st.pose} frame={frame} eyes={l.eyes} mood={st.mood} look={st.look} holds={l.holds} seed={st.seed} shadow={l.shadow && p.r === 0} talking={talkingAt(l, frame)} seatSole={l.seatSole} />
            </g>
          </g>
        );
      }
      case "prop": {
        const lit = stepAt(l.ons, frame, l.on).v;
        // carried: the prop rides in its carrier's front hand, held by its grip point
        const hold = stepAt((l.held ?? []).map((h) => [h.from, h] as const), frame, undefined as (typeof l.held extends (infer H)[] | undefined ? H : never) | undefined).v;
        const carrier = hold && (hold.until === undefined || frame < hold.until) ? film.layers[hold.by] : undefined;
        if (carrier && carrier.t === "person") {
          const st = personState(carrier, hold!.by, frame);
          const [hx, hy] = carryPoint(st, frame);
          const g = hold!.grip ?? PROPS[l.kind].grip ?? [0, -PROPS[l.kind].h / 2];
          // a carried thing keeps its own orientation in the world (it does not mirror when it changes hands or the carrier turns)
          const fl = l.flip;
          return (
            <g key={it.key} transform={camT(1)} opacity={o}>
              <g transform={`translate(${hx},${hy}) scale(${s * (fl ? -1 : 1)},${s}) translate(${-g[0]},${-g[1]})`}><PropArt layer={{ ...l, on: lit, shadow: false }} frame={frame} grade={grade} /></g>
            </g>
          );
        }
        return wrap(<PropArt layer={{ ...l, on: lit }} frame={frame} grade={grade} />, l.flip ? -1 : 1);
      }
      case "hand": return <g key={it.key} transform={camT(1)} style={blur > 0 ? { filter: `blur(${blur}px)` } : undefined}><Hand layer={l} x={x} y={y} scale={s} frame={frame} opacity={o} /></g>;
      case "phone": return wrap(<Phone layer={l} frame={frame} />);
      case "calendar": return wrap(<Calendar layer={{ ...l, crumple: val(l.crumple, frame, 0) }} frame={frame} />);
      case "screen": {
        const start = typeof l.cursorAt === "number" ? l.cursorAt : undefined;
        const p = start === undefined ? undefined : clamp01((frame - start) / 30);
        const cur = p === undefined ? undefined : { x: -120 + (1180 / 2 - 180 + 120) * p, y: 80 + (700 / 2 - 80 - 80) * p };
        return wrap(<Screen layer={l} frame={frame} cursor={cur} />);
      }
      case "books": return wrap(<Books layer={l} frame={frame} lid={val(l.lid, frame, 0)} />);
      case "sign": return wrap(<Sign text={l.text} />);
      case "poster": return wrap(<Poster layer={l} frame={frame} />);
      default: return null;
    }
  };

  const fi = film.fadeIn > 0 ? 1 - clamp01(frame / film.fadeIn) : 0;
  const fo = film.fadeOut > 0 ? clamp01((frame - (durationFrames - film.fadeOut)) / film.fadeOut) : 0;
  const black = Math.max(fi, fo);
  const captions = film.layers.filter((l): l is Extract<FilmLayer, { t: "caption" }> => l.t === "caption");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0 }}>
      <FilmDefs />
      <rect width={W} height={H} fill="#000" />
      {items.map(renderItem)}
      {captions.map((c, i) => <Caption key={i} layer={c} frame={frame} />)}
      {black > 0 && <rect width={W} height={H} fill="#000" opacity={black} />}
    </svg>
  );
};
