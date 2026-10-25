/**
 * The things in the shots: the phone with its alarm / keyboard, the wall calendar (X marks and checks drawn on over time), an
 * editor screen, books and boxes, a returns sign, and a poster written with a marker. Origin of each = its centre.
 */
import React from "react";
import type { FilmLayer } from "./schema";
import { HAND_FONT, MARKER_FONT, UI_FONT } from "./fonts";

type L<T extends FilmLayer["t"]> = Extract<FilmLayer, { t: T }>;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ───────────────────────────── phone ─────────────────────────────

const KEYS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export const Phone: React.FC<{ layer: L<"phone">; frame: number }> = ({ layer, frame }) => {
  const W = 520, H = 920;
  const pressed = layer.pressAt !== undefined && frame >= layer.pressAt;
  const stopped = pressed && layer.pressTarget === "stop";
  const screenOff = stopped && frame >= (layer.pressAt ?? 0) + 8;
  const shake = layer.ring && layer.mode === "alarm" ? Math.sin(frame * 2.1) * 3 : 0;
  const typed = layer.text !== undefined ? layer.typeStart + layer.text.slice(0, Math.max(0, Math.floor((frame - layer.typeFrom) / Math.max(1, layer.typeEvery)) + 1)) : "";
  const cursor = Math.floor(frame / 15) % 2 === 0 ? "|" : "";
  return (
    <g transform={`translate(${shake},0)`}>
      <rect x={-W / 2 - 14} y={-H / 2 - 14} width={W + 28} height={H + 28} rx={84} fill="#0a0e14" stroke="#2c3644" strokeWidth={6} />
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={70} fill={layer.mode === "dark" ? "#05070a" : "url(#fl-phone)"} />
      <defs><linearGradient id="fl-phone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a2a40" /><stop offset="1" stopColor="#0b1422" /></linearGradient></defs>
      {layer.mode === "alarm" && (
        <g fontFamily={UI_FONT} textAnchor="middle">
          <text y={-H / 2 + 120} fontSize={30} fill="#cfd8e3" opacity={0.85} fontWeight={600}>{layer.date}</text>
          <text y={-H / 2 + 300} fontSize={176} fill="#fff" fontWeight={600} letterSpacing={-4}>{layer.time}</text>
          <text y={-H / 2 + 366} fontSize={30} fill="#aab6c4" fontWeight={800} letterSpacing={2}>{layer.label}</text>
          <g transform={`translate(0,40) scale(${pressed && !stopped ? 0.96 : 1})`} opacity={pressed && !stopped ? 0.7 : 1}>
            <rect x={-170} y={20} width={340} height={92} rx={46} fill="#cfd6e0" />
            <text y={82} fontSize={38} fill="#1a2433" fontWeight={900} letterSpacing={2}>SNOOZE</text>
          </g>
          <rect x={-120} y={170} width={240} height={62} rx={31} fill={stopped ? "#cfd6e0" : "none"} stroke="#7d8a9b" strokeWidth={3} />
          <text y={212} fontSize={26} fill={stopped ? "#1a2433" : "#9aa7b8"} fontWeight={800}>STOP</text>
        </g>
      )}
      {layer.mode === "keyboard" && (
        <g fontFamily={UI_FONT} textAnchor="middle">
          <text y={-H / 2 + 110} fontSize={92} fill="#fff" fontWeight={600}>{layer.time}</text>
          <text x={-W / 2 + 56} y={-H / 2 + 190} fontSize={22} fill="#8fa0b4" textAnchor="start">Label</text>
          <rect x={-W / 2 + 44} y={-H / 2 + 204} width={W - 88} height={70} rx={14} fill="#26364b" />
          <text x={-W / 2 + 64} y={-H / 2 + 252} fontSize={36} fill="#fff" fontWeight={800} textAnchor="start">{typed}{cursor}</text>
          <rect x={-W / 2} y={60} width={W} height={H / 2 - 60 + 0} fill="#101826" />
          {KEYS.map((row, ri) => row.split("").map((k, ci) => {
            const kw = 44, gap = 8, w = row.length * (kw + gap) - gap;
            const kx = -w / 2 + ci * (kw + gap) + kw / 2, ky = 110 + ri * 76;
            const hot = typed.slice(-1).toUpperCase() === k && Math.floor(frame) % layer.typeEvery < 3;
            return <g key={k + ri}><rect x={kx - kw / 2} y={ky - 30} width={kw} height={58} rx={9} fill={hot ? "#f2f4f7" : "#33445c"} /><text x={kx} y={ky + 12} fontSize={26} fill={hot ? "#101826" : "#fff"} fontWeight={600}>{k}</text></g>;
          }))}
          <rect x={-150} y={332} width={300} height={56} rx={9} fill="#33445c" />
        </g>
      )}
      {screenOff && <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={70} fill="#05070a" opacity={0.88} />}
    </g>
  );
};

// ───────────────────────────── calendar ─────────────────────────────

const PALETTES: Record<string, string[]> = {
  pastel: ["#7fb29a", "#7a9cc6", "#a99bc4", "#82b5a8", "#8aa8cf", "#b3a5ca"],
  warm: ["#e8a26b", "#e9c46a", "#e57f6a", "#ecb77f", "#e3a36d", "#efc98b"],
  sheet: ["#cfd9e6", "#dbe3ee", "#c5d2e2", "#d6deea", "#cbd6e4", "#dde5ef"],
};

export const Calendar: React.FC<{ layer: L<"calendar">; frame: number }> = ({ layer, frame }) => {
  const W = 440, H = 600, cw = 50, ch = 82, gx = 6, gy = 8;
  const x0 = -(7 * cw + 6 * gx) / 2, y0 = -H / 2 + 120;
  const pal = PALETTES[layer.palette];
  const mark = (c: number, r: number, kind: "x" | "check", p: number, key: string) => {
    const cx = x0 + c * (cw + gx) + cw / 2, cy = y0 + r * (ch + gy) + ch / 2;
    const dash = (len: number) => ({ strokeDasharray: len, strokeDashoffset: len * (1 - p) });
    return kind === "x" ? (
      <g key={key} stroke="#d9453d" strokeWidth={9} strokeLinecap="round" opacity={0.95}>
        <line x1={cx - 20} y1={cy - 34} x2={cx + 20} y2={cy + 34} {...dash(80)} />
        <line x1={cx + 20} y1={cy - 34} x2={cx - 20} y2={cy + 34} {...dash(80)} />
      </g>
    ) : (
      <polyline key={key} points={`${cx - 20},${cy} ${cx - 5},${cy + 20} ${cx + 22},${cy - 22}`} fill="none" stroke="#2f9e5c" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" {...dash(90)} />
    );
  };
  const crumple = typeof layer.crumple === "number" ? layer.crumple : 0;
  return (
    <g transform={`scale(${1 - 0.35 * crumple},${1 - 0.15 * crumple}) skewX(${crumple * 9})`}>
      <rect x={-W / 2 + 10} y={-H / 2 + 14} width={W} height={H} rx={8} fill="#000" opacity={0.28} filter="url(#fl-soft2)" />
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={8} fill="#f6f7f8" />
      <text y={-H / 2 + 72} textAnchor="middle" fontFamily={UI_FONT} fontSize={Math.min(46, 780 / Math.max(8, layer.title.length))} fontWeight={900} fill="#3a4047" letterSpacing={1}>{layer.title}</text>
      <line x1={-W / 2 + 40} y1={-H / 2 + 92} x2={W / 2 - 40} y2={-H / 2 + 92} stroke="#3a4047" strokeWidth={3} />
      {Array.from({ length: 28 }).map((_, i) => {
        const c = i % 7, r = Math.floor(i / 7);
        const cx = x0 + c * (cw + gx), cy = y0 + r * (ch + gy);
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={cw} height={ch} rx={6} fill={pal[(i * 5 + r * 3) % pal.length]} />
            <rect x={cx + 9} y={cy + 20} width={cw - 18} height={4} rx={2} fill="#fff" opacity={0.55} />
            <rect x={cx + 9} y={cy + 32} width={cw - 28} height={4} rx={2} fill="#fff" opacity={0.4} />
          </g>
        );
      })}
      {Array.from({ length: layer.filled }).map((_, i) => mark(i % 7, Math.floor(i / 7), layer.filledKind, 1, `f${i}`))}
      {layer.marks.map((m, i) => mark(m.c, m.r, m.kind, clamp01((frame - m.at) / 9), `m${i}`))}
      {crumple > 0 && Array.from({ length: 14 }).map((_, i) => <line key={i} x1={-W / 2 + ((i * 97) % W)} y1={-H / 2 + ((i * 53) % H)} x2={-W / 2 + ((i * 97 + 140) % W)} y2={-H / 2 + ((i * 53 + 190) % H)} stroke={i % 2 ? "#fff" : "#8a9096"} strokeWidth={4} opacity={0.5 * crumple} />)}
    </g>
  );
};

// ───────────────────────────── editor screen ─────────────────────────────

export const Screen: React.FC<{ layer: L<"screen">; frame: number; cursor: { x: number; y: number } | undefined }> = ({ layer, frame, cursor }) => {
  const W = 1180, H = 700;
  const full = layer.title;
  const shown = layer.typeFrom !== undefined ? layer.typeFrom.slice(0, 0) + full.slice(0, Math.max(0, Math.floor((frame - layer.typeAt) / Math.max(1, layer.typeEvery)) + 1)) : full;
  const pal = PALETTES.sheet;
  return (
    <g>
      <rect x={-W / 2 - 40} y={-H / 2 - 40} width={W + 80} height={H + 80} fill="#0a0d12" rx={10} />
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#fbfbfc" />
      <rect x={-W / 2} y={-H / 2} width={W} height={36} fill="#e4e7ea" />
      {[0, 1, 2].map((i) => <circle key={i} cx={-W / 2 + 24 + i * 22} cy={-H / 2 + 18} r={6} fill={["#e5675d", "#e8b54d", "#62b66b"][i]} />)}
      <text y={-H / 2 + 130} textAnchor="middle" fontFamily={UI_FONT} fontSize={56} fontWeight={900} fill="#3a4047">{shown}{Math.floor(frame / 15) % 2 === 0 && shown.length < full.length ? "|" : ""}</text>
      <line x1={-W / 2 + 160} y1={-H / 2 + 160} x2={W / 2 - 160} y2={-H / 2 + 160} stroke="#3a4047" strokeWidth={3} />
      {Array.from({ length: 28 }).map((_, i) => {
        const c = i % 7, r = Math.floor(i / 7);
        return <g key={i}><rect x={-W / 2 + 160 + c * 124} y={-H / 2 + 186 + r * 92} width={116} height={82} rx={6} fill={pal[(i * 5) % pal.length]} /><rect x={-W / 2 + 176 + c * 124} y={-H / 2 + 210 + r * 92} width={70} height={5} rx={2} fill="#9aa8ba" /></g>;
      })}
      {[0, 1].map((i) => <rect key={i} x={i ? W / 2 - 150 : -W / 2 + 20} y={-H / 2 + 186} width={130} height={366} rx={8} fill={i ? "#5b7fa6" : "#4d8a76"} opacity={0.85} />)}
      {layer.button && <g transform={`translate(${W / 2 - 150},${H / 2 - 56})`}><rect width={120} height={42} rx={8} fill="#3b82f6" /><text x={60} y={29} textAnchor="middle" fontFamily={UI_FONT} fontSize={22} fontWeight={800} fill="#fff">{layer.button}</text></g>}
      {cursor && <path d={`M${cursor.x},${cursor.y} l0,34 l9,-8 l8,18 l8,-4 l-8,-18 l12,-1 Z`} fill="#111" stroke="#fff" strokeWidth={2} />}
    </g>
  );
};

// ───────────────────────────── books, sign, poster ─────────────────────────────

const Book: React.FC<{ w: number; h: number; c: string; x?: number; y?: number; r?: number }> = ({ w, h, c, x = 0, y = 0, r = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${r})`}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={5} fill={c} stroke="#00000033" strokeWidth={3} />
    <rect x={-w / 2 + 6} y={h / 2 - 12} width={w - 12} height={8} fill="#f4f1e6" />
    <rect x={-w / 2 + 12} y={-h / 2 + 10} width={w * 0.3} height={5} rx={2} fill="#fff" opacity={0.6} />
  </g>
);

export const Books: React.FC<{ layer: L<"books">; frame: number; lid: number }> = ({ layer, lid }) => {
  switch (layer.kind) {
    case "box":
      return (
        <g>
          <ellipse cx={0} cy={86} rx={210} ry={26} fill="#000" opacity={0.25} filter="url(#fl-soft2)" />
          <rect x={-190} y={-60} width={380} height={140} rx={6} fill="#5f7184" stroke="#2f3946" strokeWidth={4} />
          <g transform={`translate(0,${-lid * 70}) rotate(${lid * -8} -190 -60)`}>
            <rect x={-198} y={-96} width={396} height={44} rx={6} fill="#7c8ea1" stroke="#2f3946" strokeWidth={4} />
          </g>
          <g transform="translate(0,12)"><rect x={-38} y={-34} width={76} height={58} rx={4} fill="#eef1f4" /><rect x={-26} y={-20} width={40} height={6} fill="#5f7184" /><rect x={-26} y={-6} width={52} height={6} fill="#9aa8ba" /></g>
          {layer.label && <text y={60} textAnchor="middle" fontFamily={UI_FONT} fontSize={22} fontWeight={800} fill="#e9eef3">{layer.label}</text>}
        </g>
      );
    case "pair":
      return (
        <g>
          <ellipse cx={0} cy={36} rx={230} ry={30} fill="#000" opacity={0.3} filter="url(#fl-soft2)" />
          <Book w={250} h={70} c="#4f6fa3" x={-70} y={6} r={-4} /><Book w={250} h={64} c="#c8b46c" x={40} y={-34} r={5} />
        </g>
      );
    case "stack":
      return (
        <g>
          <ellipse cx={0} cy={70} rx={190} ry={22} fill="#000" opacity={0.3} filter="url(#fl-soft2)" />
          <Book w={300} h={60} c="#4f6fa3" y={40} /><Book w={280} h={56} c="#b46a6a" y={-16} r={-2} /><Book w={290} h={58} c="#6fa58f" y={-70} r={3} /><Book w={250} h={52} c="#c8b46c" y={-122} r={-3} />
        </g>
      );
    case "bag":
      return (
        <g>
          <ellipse cx={0} cy={110} rx={150} ry={20} fill="#000" opacity={0.25} filter="url(#fl-soft2)" />
          <path d="M-100,-80 L100,-80 L110,110 L-110,110 Z" fill="#b99063" stroke="#7b5d3d" strokeWidth={4} />
          <path d="M-50,-80 Q-50,-150 0,-150 Q50,-150 50,-80" fill="none" stroke="#7b5d3d" strokeWidth={9} />
          <g transform="translate(40,-96) rotate(12)"><Book w={90} h={130} c="#4f6fa3" /></g>
        </g>
      );
    case "crumpled":
      return (
        <g>
          <ellipse cx={0} cy={54} rx={80} ry={14} fill="#000" opacity={0.3} filter="url(#fl-soft2)" />
          <path d="M-70,10 L-46,-42 L-6,-62 L40,-50 L72,-14 L62,34 L22,56 L-34,50 Z" fill="#dcdcd8" stroke="#8d8d89" strokeWidth={3} />
          {[0, 1, 2, 3, 4, 5].map((i) => <polyline key={i} points={`${-50 + i * 18},${-40 + (i % 3) * 18} ${-30 + i * 14},${0 + (i % 2) * 22} ${-10 + i * 12},${30}`} fill="none" stroke={i % 2 ? "#fff" : "#9a9a96"} strokeWidth={3} opacity={0.8} />)}
          {[0, 1, 2].map((i) => <line key={i} x1={-30 + i * 28} y1={-20 + i * 6} x2={-6 + i * 26} y2={6 + i * 4} stroke="#d9453d" strokeWidth={4} opacity={0.8} />)}
        </g>
      );
    case "open":
      return (
        <g>
          <ellipse cx={0} cy={100} rx={330} ry={30} fill="#000" opacity={0.35} filter="url(#fl-soft2)" />
          <path d="M0,-90 Q-130,-120 -280,-80 L-280,90 Q-130,52 0,90 Z" fill="#f4f0e2" stroke="#9a9484" strokeWidth={4} />
          <path d="M0,-90 Q130,-120 280,-80 L280,90 Q130,52 0,90 Z" fill="#faf6ea" stroke="#9a9484" strokeWidth={4} />
          {Array.from({ length: 9 }).map((_, i) => <g key={i} stroke="#9aa0a8" strokeWidth={4} opacity={0.6}><line x1={-250 + (i % 2) * 8} y1={-52 + i * 15} x2={-30} y2={-70 + i * 16} /><line x1={30} y1={-70 + i * 16} x2={250 - (i % 3) * 14} y2={-52 + i * 15} /></g>)}
          <line x1={0} y1={-90} x2={0} y2={90} stroke="#9a9484" strokeWidth={4} />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={0} cy={140} rx={120} ry={16} fill="#000" opacity={0.3} filter="url(#fl-soft2)" />
          <rect x={-100} y={-135} width={200} height={270} rx={8} fill="#4f6fa3" stroke="#00000033" strokeWidth={3} />
          <rect x={-72} y={-92} width={144} height={14} fill="#fff" opacity={0.75} /><rect x={-72} y={-62} width={100} height={10} fill="#fff" opacity={0.5} />
        </g>
      );
  }
};

export const Sign: React.FC<{ text: string }> = ({ text }) => {
  const [a, ...rest] = text.split(" ");
  return (
    <g>
      <rect x={-60} y={-40} width={120} height={80} fill="#000" opacity={0.2} transform="translate(5,6)" />
      <rect x={-60} y={-40} width={120} height={80} fill="#f3f4f5" stroke="#c4c9cd" strokeWidth={2} />
      <text y={-6} textAnchor="middle" fontFamily={UI_FONT} fontSize={20} fontWeight={900} fill="#3a4047">{a}</text>
      <text y={20} textAnchor="middle" fontFamily={UI_FONT} fontSize={20} fontWeight={900} fill="#3a4047">{rest.join(" ")}</text>
    </g>
  );
};

export const Poster: React.FC<{ layer: L<"poster">; frame: number }> = ({ layer, frame }) => {
  const p = layer.writeAt === undefined ? 1 : clamp01((frame - layer.writeAt) / layer.writeDur);
  const W = 420, H = 480;
  return (
    <g>
      <rect x={-W / 2 + 8} y={-H / 2 + 12} width={W} height={H} fill="#000" opacity={0.22} filter="url(#fl-soft2)" />
      <path d={layer.torn ? `M${-W / 2},${-H / 2} L${W / 2},${-H / 2 + 8} L${W / 2 - 10},${H / 2 - 30} L${W / 2 - 40},${H / 2} L${-W / 2 + 30},${H / 2 - 12} Z` : `M${-W / 2},${-H / 2} h${W} v${H} h${-W} Z`} fill="#efe9dc" />
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={-W / 2 + i * 90} y1={-H / 2} x2={-W / 2 + 120 + i * 60} y2={H / 2} stroke="#fff" strokeWidth={3} opacity={0.5} />)}
      <rect x={-34} y={-H / 2 - 12} width={68} height={26} fill="#d8cfa8" opacity={0.85} />
      <clipPath id="fl-write"><rect x={-W / 2} y={-H / 2} width={W * p} height={H} /></clipPath>
      <text clipPath="url(#fl-write)" y={44} textAnchor="middle" fontFamily={MARKER_FONT} fontSize={layer.text.length > 3 ? 130 : 300} fill="#d9453d" textLength={layer.text.length > 3 ? W - 90 : undefined} lengthAdjust="spacingAndGlyphs">{layer.text}</text>
    </g>
  );
};

export const Caption: React.FC<{ layer: L<"caption">; frame: number }> = ({ layer, frame }) => {
  const end = layer.until ?? 1e9;
  const o = Math.min(clamp01((frame - layer.at) / 6), clamp01((end - frame) / 6));
  if (o <= 0) return null;
  const st = layer.style;
  const stroke = { stroke: "rgba(0,0,0,0.7)", strokeWidth: 8, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
  return (
    <g opacity={o} transform={`translate(${layer.x},${layer.y + (1 - o) * 6})`}>
      {st === "speech" && <text textAnchor="middle" fontFamily={UI_FONT} fontSize={46} fontWeight={800} fill="#fff" {...stroke}>{layer.text}{layer.line2 ? <tspan x={0} dy={58}>{layer.line2}</tspan> : null}</text>}
      {st === "excuse" && (
        <g>
          <ellipse cx={0} cy={-6} rx={Math.max(150, layer.text.length * 17)} ry={layer.line2 ? 62 : 44} fill="#000" opacity={0.42} filter="url(#fl-soft)" />
          <text textAnchor="middle" fontFamily={HAND_FONT} fontSize={46} fill="#f4a259">{layer.text}</text>
          {layer.line2 && <text y={46} textAnchor="middle" fontFamily={HAND_FONT} fontSize={38} fill="#d98a4a">{layer.line2}</text>}
        </g>
      )}
      {st === "whisper" && <text textAnchor="middle" fontFamily={HAND_FONT} fontSize={44} fill="#aab4c4" opacity={0.9}>{layer.text}</text>}
      {st === "title" && <text textAnchor="middle" fontFamily={UI_FONT} fontSize={96} fontWeight={900} fill="#fff" {...stroke}>{layer.text}</text>}
    </g>
  );
};
