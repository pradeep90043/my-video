import React from "react";
import type { GraphicSpec } from "./spec";
import { PropIcon } from "./icons";

/**
 * Info-graphics that explain without a person: a calendar, a clock, a compass, a scroll, linked circles, a big number, a
 * checklist, a versus card, a timeline, a big icon, bars, a date card and a statement. Each is drawn inside a box and
 * builds itself up over the first seconds of the shot.
 */

const GOLD = "#f2b53a", INK = "#14121c", PAPER = "#f6ecd6", RED = "#e04a3f", WHITE = "#ffffff";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0 -> 1 with a small overshoot, starting at `start` seconds */
export const popIn = (t: number, start: number, dur = 0.45) => {
  const x = clamp01((t - start) / dur);
  return x <= 0 ? 0 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
};
const fadeIn = (t: number, start: number, dur = 0.35) => clamp01((t - start) / dur);

export interface Box { x: number; y: number; w: number; h: number }

/** Words broken into lines of at most `max` characters. */
export function wrap(s: string, max: number): string[] {
  const lines: string[] = [];
  for (const wd of s.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + wd).length <= max) lines[lines.length - 1] = last + " " + wd; else lines.push(wd);
  }
  return lines;
}

export const Graphic: React.FC<{ g: GraphicSpec; box: Box; t: number; font: string; accent?: string }> = ({ g, box, t, font, accent = GOLD }) => {
  const { x, y, w, h } = box;
  const cx = x + w / 2, cy = y + h / 2;
  const u = Math.min(w, h) / 100; // a unit: 1% of the shorter side
  const text = (s: string, tx: number, ty: number, size: number, o: { fill?: string; weight?: number; anchor?: "start" | "middle" | "end"; opacity?: number } = {}) => (
    <text x={tx} y={ty} fontSize={size} fontWeight={o.weight ?? 800} fill={o.fill ?? WHITE} textAnchor={o.anchor ?? "middle"} fontFamily={font} opacity={o.opacity ?? 1}>{s}</text>
  );
  const items = g.items.length ? g.items : [];

  switch (g.type) {
    case "calendar": {
      const n = Math.max(1, Math.min(6, items.length || 4)), gap = 3 * u, cw = Math.min(22 * u, (w - gap * (n - 1)) / n), ch = cw * 1.15;
      const x0 = cx - (n * cw + (n - 1) * gap) / 2, top = cy - ch / 2;
      return (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const k = popIn(t, 0.2 + i * 0.25), hot = g.highlight === i, bx = x0 + i * (cw + gap);
            return (
              <g key={i} transform={`translate(${bx + cw / 2} ${top + ch / 2}) scale(${k}) translate(${-cw / 2} ${-ch / 2})`}>
                <rect width={cw} height={ch} rx={1.6 * u} fill={WHITE} />
                <rect width={cw} height={ch * 0.26} rx={1.6 * u} fill={hot ? RED : "#c0392b"} />
                {text("DAY", cw / 2, ch * 0.19, ch * 0.13, { fill: WHITE })}
                {text(items[i] ?? String(i + 1), cw / 2, ch * 0.78, ch * 0.42, { fill: hot ? RED : INK, weight: 900 })}
                {g.subs[i] && text(g.subs[i], cw / 2, ch + 6 * u, 5 * u, { fill: hot ? RED : GOLD })}
              </g>
            );
          })}
        </g>
      );
    }
    case "clock": {
      const r = Math.min(w, h) * 0.38, settle = clamp01((t - 0.3) / 1.6);
      const hour = g.value ?? 4, spin = (1 - settle) * 720;
      const ha = (hour % 12) * 30 + spin * 0.1, ma = spin + settle * 0;
      return (
        <g transform={`translate(${cx} ${cy}) scale(${popIn(t, 0)})`}>
          <circle r={r} fill="#101225" stroke={accent} strokeWidth={1.2 * u} />
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1={0} y1={-r * 0.86} x2={0} y2={-r * (i % 3 ? 0.8 : 0.74)} stroke={accent} strokeWidth={i % 3 ? 0.6 * u : 1.1 * u} transform={`rotate(${i * 30})`} />)}
          <line x1={0} y1={0} x2={0} y2={-r * 0.48} stroke={WHITE} strokeWidth={1.6 * u} strokeLinecap="round" transform={`rotate(${ha})`} />
          <line x1={0} y1={0} x2={0} y2={-r * 0.7} stroke={WHITE} strokeWidth={1 * u} strokeLinecap="round" transform={`rotate(${ma})`} />
          <circle r={1.8 * u} fill={RED} />
          {g.title && text(g.title, 0, r + 9 * u, 6 * u, { fill: accent })}
        </g>
      );
    }
    case "compass": {
      const r = Math.min(w, h) * 0.38, dirs = ["N", "E", "S", "W"];
      const hot = Math.max(0, dirs.indexOf((g.text ?? "S").toUpperCase().slice(0, 1)));
      const needle = hot * 90 + (1 - clamp01((t - 0.4) / 1.4)) * 300;
      return (
        <g transform={`translate(${cx} ${cy}) scale(${popIn(t, 0)})`}>
          <circle r={r} fill="#101225" stroke={accent} strokeWidth={1.2 * u} />
          {dirs.map((d, i) => {
            const a = (i * 90 - 90) * Math.PI / 180, on = i === hot;
            return <g key={d}>{on && <circle cx={Math.cos(a) * r * 0.72} cy={Math.sin(a) * r * 0.72} r={9 * u} fill={RED} opacity={0.35 + 0.25 * Math.sin(t * 5)} />}{text(d, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72 + 3.5 * u, 10 * u, { fill: on ? "#ff6b5e" : WHITE, weight: 900 })}</g>;
          })}
          <g transform={`rotate(${needle})`}><path d={`M 0 ${-r * 0.5} L ${2.5 * u} 0 L 0 ${r * 0.12} L ${-2.5 * u} 0 Z`} fill={RED} /></g>
          <circle r={2.4 * u} fill={WHITE} />
          {g.title && text(g.title, 0, r + 9 * u, 6 * u, { fill: accent })}
        </g>
      );
    }
    case "scroll": {
      const sw = Math.min(w * 0.8, h * 0.75), sh = sw * 1.25, open = clamp01((t - 0.1) / 0.7);
      const visH = sh * (0.15 + 0.85 * open);
      return (
        <g transform={`translate(${cx - sw / 2} ${cy - sh / 2})`}>
          <rect x={0} y={(sh - visH) / 2} width={sw} height={visH} fill={PAPER} />
          <rect x={-2 * u} y={(sh - visH) / 2 - 3 * u} width={sw + 4 * u} height={5 * u} rx={2.5 * u} fill="#b5843f" />
          <rect x={-2 * u} y={(sh + visH) / 2 - 2 * u} width={sw + 4 * u} height={5 * u} rx={2.5 * u} fill="#b5843f" />
          {open > 0.6 && (
            <g opacity={fadeIn(t, 0.7)}>
              {wrap(g.title ?? g.text ?? "", 13).slice(0, 3).map((line, i) => text(line.toUpperCase(), sw / 2, sh * 0.22 + i * 11 * u, 9 * u, { fill: "#7a3414", weight: 900 }))}
              {(items.length ? items : ["", "", "", ""]).slice(0, 5).map((it, i) => it
                ? text(it, sw / 2, sh * 0.55 + i * 8 * u, 5 * u, { fill: "#6b4a2a", weight: 700 })
                : <rect key={i} x={sw * 0.1} y={sh * 0.55 + i * 6 * u} width={sw * (i % 2 ? 0.6 : 0.8)} height={1.2 * u} fill="#d2b98e" />)}
            </g>
          )}
        </g>
      );
    }
    case "nodes": {
      const n = Math.max(2, Math.min(5, items.length || 2)), vertical = h > w * 1.1;
      const R = Math.min(vertical ? h / (n * 2.9) : w / (n * 3.2), Math.min(w, h) * 0.17);
      // vertical: the circles sit left of centre and the words go to their right, so a label never runs into the next circle
      const lx = vertical ? R + 4 * u : 0;
      const pts = Array.from({ length: n }, (_, i) => vertical ? { x: x + w * 0.3, y: y + h * ((i + 0.5) / n) } : { x: x + w * ((i + 0.5) / n), y: cy });
      return (
        <g>
          {pts.slice(1).map((p, i) => {
            const k = clamp01((t - 0.3 - i * 0.5) / 0.5), a = pts[i];
            return <line key={i} x1={a.x} y1={a.y} x2={a.x + (p.x - a.x) * k} y2={a.y + (p.y - a.y) * k} stroke={accent} strokeWidth={0.9 * u} />;
          })}
          {pts.map((p, i) => {
            const k = popIn(t, 0.1 + i * 0.5), hot = g.highlight === i;
            return (
              <g key={i} transform={`translate(${p.x} ${p.y}) scale(${k})`}>
                <circle r={R} fill="#151a33" stroke={hot ? RED : accent} strokeWidth={1.1 * u} />
                {hot && <circle r={R + 2 * u} fill="none" stroke={RED} strokeWidth={0.6 * u} opacity={0.5 + 0.4 * Math.sin(t * 4)} />}
                <PropIcon name={g.icons[i] ?? "star"} size={R * 1.15} />
                {vertical ? <>
                  {text(items[i] ?? "", lx, g.subs[i] ? -1 * u : 2 * u, 6.2 * u, { fill: WHITE, weight: 800, anchor: "start" })}
                  {g.subs[i] && text(g.subs[i], lx, 5.5 * u, 4.4 * u, { fill: accent, weight: 700, anchor: "start" })}
                </> : <>
                  {text(items[i] ?? "", 0, R + 6.5 * u, 5.2 * u, { fill: WHITE, weight: 800 })}
                  {g.subs[i] && text(g.subs[i], 0, R + 11.5 * u, 3.8 * u, { fill: accent, weight: 700 })}
                </>}
              </g>
            );
          })}
        </g>
      );
    }
    case "stat": {
      const target = g.value ?? 0, k = clamp01((t - 0.2) / 1.2), shown = Math.round(target * (1 - Math.pow(1 - k, 3)));
      return (
        <g transform={`translate(${cx} ${cy})`}>
          {(() => { const unit = g.text && g.text.length <= 3 ? g.text : "";
            const label = `${shown.toLocaleString("en-IN")}${unit}`, full = `${target.toLocaleString("en-IN")}${unit}`;
            return <g transform={`scale(${popIn(t, 0)})`}>{text(label, 0, 8 * u, Math.min(26 * u, (w * 0.9) / (full.length * 0.62)), { fill: accent, weight: 900 })}</g>; })()}
          {/* a longer "unit" is a label: it goes under the number, with the title */}
          {[g.text && g.text.length > 3 ? g.text : undefined, g.title ?? items[0]].filter(Boolean).map((l, i) => text(l!, 0, (24 + i * 9) * u, 6.5 * u, { opacity: fadeIn(t, 0.6 + i * 0.2) }))}
        </g>
      );
    }
    case "list": {
      const n = Math.min(6, items.length), lh = Math.min(15 * u, h / Math.max(1, n));
      return (
        <g>
          {items.slice(0, n).map((it, i) => {
            const k = fadeIn(t, 0.2 + i * 0.45), yy = cy - (n * lh) / 2 + i * lh + lh / 2;
            return (
              <g key={i} opacity={k} transform={`translate(${(1 - k) * -8 * u} 0)`}>
                <rect x={x + w * 0.06} y={yy - lh * 0.4} width={w * 0.88} height={lh * 0.8} rx={2 * u} fill="#0e1124" opacity={0.75} stroke={accent} strokeWidth={0.4 * u} />
                <g transform={`translate(${x + w * 0.06 + lh * 0.45} ${yy})`}><PropIcon name={g.icons[i] ?? "check"} size={lh * 0.55} /></g>
                {text(it, x + w * 0.06 + lh * 0.9, yy + 2 * u, Math.min(5.6 * u, lh * 0.38), { anchor: "start" })}
              </g>
            );
          })}
        </g>
      );
    }
    case "versus": {
      const R = Math.min(w * 0.2, h * 0.3);
      return (
        <g>
          {[0, 1].map((i) => {
            const px = i ? x + w * 0.76 : x + w * 0.24, k = popIn(t, 0.1 + i * 0.35);
            return (
              <g key={i} transform={`translate(${px} ${cy}) scale(${k})`}>
                <circle r={R} fill="#151a33" stroke={i ? RED : "#3fa66b"} strokeWidth={1.2 * u} />
                <PropIcon name={g.icons[i] ?? (i ? "cross" : "check")} size={R * 1.1} />
                {text(items[i] ?? "", 0, R + 8 * u, 6 * u)}
              </g>
            );
          })}
          <g transform={`translate(${cx} ${cy}) scale(${popIn(t, 0.8)})`}>{text("VS", 0, 4 * u, 12 * u, { fill: accent, weight: 900 })}</g>
        </g>
      );
    }
    case "timeline": {
      const n = Math.max(2, Math.min(6, items.length)), k = clamp01((t - 0.1) / 1.2), x0 = x + w * 0.08, x1 = x + w * 0.92;
      return (
        <g>
          <line x1={x0} y1={cy} x2={x0 + (x1 - x0) * k} y2={cy} stroke={accent} strokeWidth={1 * u} />
          {items.slice(0, n).map((it, i) => {
            const px = x0 + ((x1 - x0) * i) / (n - 1), o = popIn(t, 0.2 + i * 0.3), hot = g.highlight === i;
            return (
              <g key={i} transform={`translate(${px} ${cy}) scale(${o})`}>
                <circle r={3 * u} fill={hot ? RED : accent} />
                {text(it, 0, i % 2 ? 11 * u : -7 * u, 4.6 * u)}
                {g.subs[i] && text(g.subs[i], 0, i % 2 ? 16 * u : -13 * u, 3.6 * u, { fill: accent })}
              </g>
            );
          })}
        </g>
      );
    }
    case "icon": {
      const k = popIn(t, 0), s = Math.min(w, h) * 0.55;
      return (
        <g transform={`translate(${cx} ${cy})`}>
          <circle r={s * 0.75} fill={accent} opacity={0.12 + 0.06 * Math.sin(t * 3)} />
          <g transform={`scale(${k}) translate(0 ${Math.sin(t * 1.6) * 1.5 * u})`}><PropIcon name={g.icons[0] ?? "star"} size={s} /></g>
          {(g.text ?? items[0]) && text(g.text ?? items[0], 0, s * 0.75 + 8 * u, 7 * u, { opacity: fadeIn(t, 0.5) })}
        </g>
      );
    }
    case "bars": {
      const n = Math.max(1, Math.min(6, items.length)), max = Math.max(1, ...g.values.slice(0, n)), bw = (w * 0.8) / n;
      return (
        <g>
          {items.slice(0, n).map((it, i) => {
            const v = g.values[i] ?? 0, k = clamp01((t - 0.2 - i * 0.15) / 0.8), bh = (h * 0.62 * v * (1 - Math.pow(1 - k, 3))) / max;
            const bx = x + w * 0.1 + i * bw, base = y + h * 0.8;
            return (
              <g key={i}>
                <rect x={bx + bw * 0.15} y={base - bh} width={bw * 0.7} height={bh} rx={1.2 * u} fill={g.highlight === i ? RED : accent} />
                {text(String(Math.round(v * k)), bx + bw / 2, base - bh - 2 * u, 4.6 * u)}
                {text(it, bx + bw / 2, base + 6 * u, 4 * u, { fill: "#d8d2c4" })}
              </g>
            );
          })}
        </g>
      );
    }
    case "date-card": {
      const cw = Math.min(w * 0.86, 80 * u), chh = 34 * u, k = popIn(t, 0.1);
      const lines = (g.text ?? g.title ?? "").split(/\s*\|\s*/).slice(0, 2);
      return (
        <g transform={`translate(${cx} ${cy}) scale(${k})`}>
          <rect x={-cw / 2} y={-chh / 2} width={cw} height={chh} rx={2 * u} fill="#11132a" opacity={0.92} />
          <rect x={-cw / 2} y={-chh / 2} width={cw} height={2.6 * u} fill={accent} />
          {lines.map((l, i) => text(l.toUpperCase(), 0, -chh * 0.05 + i * 9 * u, 7.4 * u, { weight: 900 }))}
          {g.subs[0] && text(g.subs[0], 0, chh * 0.38, 4.4 * u, { fill: accent })}
        </g>
      );
    }
    case "map": {
      const mw = Math.min(w, h * 1.1) * 0.95, mh = mw * 0.8, mx = cx - mw / 2, my = cy - mh / 2;
      const A = { x: mx + mw * 0.18, y: my + mh * 0.72 }, B = { x: mx + mw * 0.82, y: my + mh * 0.3 };
      const ctrl = { x: mx + mw * 0.5, y: my + mh * 0.85 };
      const k = clamp01((t - 0.5) / 1.6);
      const along = (q: number) => ({ x: (1 - q) * (1 - q) * A.x + 2 * (1 - q) * q * ctrl.x + q * q * B.x, y: (1 - q) * (1 - q) * A.y + 2 * (1 - q) * q * ctrl.y + q * q * B.y });
      const len = 900, mover = along(k);
      return (
        <g opacity={fadeIn(t, 0)}>
          <rect x={mx} y={my} width={mw} height={mh} rx={2 * u} fill={PAPER} />
          {[0.18, 0.36, 0.54].map((q) => <path key={q} d={`M ${mx + mw * q} ${my + mh * 0.18} l ${3 * u} ${-5 * u} l ${3 * u} ${5 * u} Z`} fill="#b39669" />)}
          <path d={`M ${mx} ${my + mh * 0.5} Q ${mx + mw * 0.4} ${my + mh * 0.4} ${mx + mw} ${my + mh * 0.62}`} stroke="#7fb3d9" strokeWidth={1.4 * u} fill="none" />
          <path d={`M ${A.x} ${A.y} Q ${ctrl.x} ${ctrl.y} ${B.x} ${B.y}`} stroke={RED} strokeWidth={0.9 * u} fill="none" strokeDasharray={`${2 * u} ${1.5 * u}`} pathLength={len} style={{ strokeDashoffset: 0 }} opacity={0.35} />
          <path d={`M ${A.x} ${A.y} Q ${ctrl.x} ${ctrl.y} ${B.x} ${B.y}`} stroke={RED} strokeWidth={1.1 * u} fill="none" pathLength={1} strokeDasharray={`${k} 1`} />
          {[A, B].map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y}) scale(${popIn(t, 0.2 + i * 0.3)})`}>
              <path d={`M 0 0 Q ${-4 * u} ${-5 * u} ${-4 * u} ${-8 * u} A ${4 * u} ${4 * u} 0 1 1 ${4 * u} ${-8 * u} Q ${4 * u} ${-5 * u} 0 0 Z`} fill={i ? RED : "#3b6fd1"} />
              <circle cx={0} cy={-8.5 * u} r={1.6 * u} fill="#fff" />
              {text(items[i] ?? "", 0, 6 * u, 4.6 * u, { fill: "#4a2c14", weight: 900 })}
            </g>
          ))}
          {k > 0 && k < 1 && <g transform={`translate(${mover.x} ${mover.y - 3 * u})`}><PropIcon name={g.icons[0] ?? "star"} size={9 * u} /></g>}
          <g transform={`translate(${mx + mw - 8 * u} ${my + mh - 8 * u})`}><circle r={5 * u} fill="none" stroke="#8b6b3e" strokeWidth={0.5 * u} /><path d={`M 0 ${-4.5 * u} L ${1.2 * u} 0 L 0 ${4.5 * u} L ${-1.2 * u} 0 Z`} fill="#8b6b3e" />{text("N", 0, -6.2 * u, 2.6 * u, { fill: "#8b6b3e" })}</g>
          {g.title && text(g.title, cx, my - 3 * u, 6 * u, { fill: accent })}
        </g>
      );
    }
    case "statement": {
      const lines = wrap((g.text ?? g.title ?? "").toUpperCase(), 16);
      const size = Math.min(13 * u, (w * 1.6) / Math.max(8, ...lines.map((l) => l.length)));
      return (
        <g>
          {lines.slice(0, 4).map((l, i) => {
            const k = fadeIn(t, 0.1 + i * 0.18);
            return <g key={i} opacity={k} transform={`translate(0 ${(1 - k) * 4 * u})`}>{text(l, cx, cy - ((lines.length - 1) * size * 1.15) / 2 + i * size * 1.15 + size * 0.35, size, { weight: 900 })}</g>;
          })}
        </g>
      );
    }
    default: return null;
  }
};

/** Things in front of the people: flood water rising, the white flash of lightning. */
export const FxFront: React.FC<{ kind: string; W: number; H: number; t: number }> = ({ kind, W, H, t }) => {
  if (kind === "flood") {
    const level = H * (0.86 - 0.1 * Math.min(1, t / 3));
    return (
      <g>
        <path d={`M 0 ${level} ${Array.from({ length: 13 }, (_, i) => `Q ${(i + 0.5) * W / 12} ${level + (i % 2 ? 14 : -14) + Math.sin(t * 2 + i) * 6} ${(i + 1) * W / 12} ${level}`).join(" ")} L ${W} ${H} L 0 ${H} Z`} fill="#3d6f9e" opacity={0.85} />
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M ${((i * 137 + t * 40) % W)} ${level + 40 + (i % 3) * 40} q 20 -8 40 0`} stroke="#a8cdf0" strokeWidth={4} fill="none" />)}
      </g>
    );
  }
  if (kind === "storm") {
    const cycle = t % 2.6, flash = cycle < 0.08 || (cycle > 0.16 && cycle < 0.22);
    if (!flash) return null;
    const x = W * (0.2 + ((Math.floor(t / 2.6) * 37) % 60) / 100);
    return (
      <g>
        <rect width={W} height={H} fill="#ffffff" opacity={0.28} />
        <path d={`M ${x} 0 L ${x - 40} ${H * 0.18} L ${x + 10} ${H * 0.18} L ${x - 50} ${H * 0.38}`} stroke="#fffbe0" strokeWidth={8} fill="none" />
      </g>
    );
  }
  return null;
};

/** Weather and light: drawn over the background, under the people (stars, dust, embers, snow, petals...). */
export const Fx: React.FC<{ kind: string; W: number; H: number; t: number }> = ({ kind, W, H, t }) => {
  const r = (i: number) => { const v = Math.sin(i * 91.7 + 17.3) * 43758.5453; return v - Math.floor(v); };
  const n = kind === "rain" ? 90 : kind === "snow" || kind === "confetti" ? 60 : 40;
  if (kind === "none" || kind === "flood") return null;
  const clouds = (dark: boolean) => (
    <g opacity={dark ? 0.95 : 0.8}>
      {Array.from({ length: 7 }, (_, i) => {
        const x = ((r(i + 90) * W * 1.4 + t * (14 + i * 3)) % (W * 1.4)) - W * 0.2, y = H * (0.02 + r(i + 40) * 0.12), k = Math.min(W, H) / 1080 * (1.1 + r(i + 5));
        return <g key={i} transform={`translate(${x} ${y}) scale(${k})`} fill={dark ? (i % 2 ? "#2e3346" : "#3a4058") : "#ffffff"}><ellipse rx={150} ry={50} /><circle cx={-60} cy={-30} r={60} /><circle cx={40} cy={-50} r={74} /><circle cx={110} cy={-12} r={46} /></g>;
      })}
    </g>
  );
  if (kind === "clouds") return clouds(false);
  if (kind === "storm") return (
    <g>
      <rect width={W} height={H} fill="#0b0e1a" opacity={0.35} />
      {clouds(true)}
      {Array.from({ length: 110 }, (_, i) => { const x0 = r(i) * W, y0 = r(i + 50) * H, yy = (y0 + t * 1000 * (0.6 + r(i + 7))) % H; return <line key={i} x1={x0} y1={yy} x2={x0 - 8} y2={yy + 30} stroke="#b9d6ff" strokeWidth={2.2} opacity={0.6} />; })}
    </g>
  );
  if (kind === "rays") return (
    <g opacity={0.22}>{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M ${W * (0.15 + i * 0.18)} 0 L ${W * (0.05 + i * 0.18)} ${H} L ${W * (0.17 + i * 0.18)} ${H} L ${W * (0.21 + i * 0.18)} 0 Z`} fill="#fff6d0" opacity={0.5 + 0.5 * Math.sin(t * 0.8 + i)} />)}</g>
  );
  if (kind === "rings") return (
    <g>{[0, 1, 2].map((i) => { const k = ((t * 0.35 + i / 3) % 1); return <circle key={i} cx={W / 2} cy={H * 0.45} r={k * Math.max(W, H) * 0.5} fill="none" stroke="#ffd36e" strokeWidth={3} opacity={(1 - k) * 0.5} />; })}</g>
  );
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x0 = r(i) * W, y0 = r(i + 50) * H, sp = 0.5 + r(i + 7);
        switch (kind) {
          case "stars": return <circle key={i} cx={x0} cy={y0 * 0.8} r={1.5 + r(i + 3) * 2} fill="#fff" opacity={0.3 + 0.7 * Math.abs(Math.sin(t * sp * 2 + i))} />;
          case "dust": return <circle key={i} cx={(x0 + t * 12 * sp) % W} cy={(y0 - t * 8 * sp + H) % H} r={2 + r(i + 3) * 3} fill="#fff3d6" opacity={0.25} />;
          case "embers": { const yy = (y0 - t * 90 * sp + H * 10) % H; return <circle key={i} cx={x0 + Math.sin(t * 2 + i) * 14} cy={yy} r={2 + r(i + 3) * 3} fill="#ff9a3c" opacity={0.75 * (yy / H)} />; }
          case "snow": return <circle key={i} cx={(x0 + Math.sin(t + i) * 20)} cy={(y0 + t * 60 * sp) % H} r={3 + r(i + 3) * 4} fill="#fff" opacity={0.85} />;
          case "rain": { const yy = (y0 + t * 900 * sp) % H; return <line key={i} x1={x0} y1={yy} x2={x0 - 6} y2={yy + 26} stroke="#b9d6ff" strokeWidth={2} opacity={0.55} />; }
          case "petals": { const yy = (y0 + t * 70 * sp) % H; return <ellipse key={i} cx={x0 + Math.sin(t * 1.5 + i) * 30} cy={yy} rx={7} ry={4} fill="#f58fb0" transform={`rotate(${t * 90 + i * 20} ${x0} ${yy})`} />; }
          case "fireflies": return <circle key={i} cx={x0 + Math.sin(t * sp + i) * 40} cy={H * 0.45 + r(i + 50) * H * 0.5 + Math.cos(t * sp * 1.3 + i) * 30} r={4} fill="#fff27a" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2 * sp + i))} />;
          case "sparkle": { const o = Math.max(0, Math.sin(t * 3 * sp + i * 2)); return <path key={i} d={`M ${x0} ${y0 - 10} L ${x0 + 3} ${y0 - 3} L ${x0 + 10} ${y0} L ${x0 + 3} ${y0 + 3} L ${x0} ${y0 + 10} L ${x0 - 3} ${y0 + 3} L ${x0 - 10} ${y0} L ${x0 - 3} ${y0 - 3} Z`} fill="#fff6c8" opacity={o} />; }
          case "confetti": { const yy = (y0 + t * 200 * sp) % H; return <rect key={i} x={x0 + Math.sin(t * 3 + i) * 20} y={yy} width={10} height={16} fill={["#ff4d6d", "#ffd23f", "#3bceac", "#5e60ce"][i % 4]} transform={`rotate(${t * 200 * sp + i * 30} ${x0} ${yy})`} />; }
          default: return null;
        }
      })}
    </g>
  );
};
