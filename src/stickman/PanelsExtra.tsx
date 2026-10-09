import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadFiraCode } from "@remotion/google-fonts/FiraCode";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import type {
  AlertSpec, BrowserSpec, ChartSpec, CompareSpec, CounterSpec, FlowSpec, NewsSpec,
  ProgressSpec, Shape, SvgSpec, TableSpec, TerminalSpec,
} from "./schema";
import type { Theme } from "./theme";
import { PANEL } from "./Panels";

const fira = loadFiraCode("normal", { weights: ["500"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["800"], subsets: ["latin"] });
const playfair = loadPlayfair("normal", { weights: ["700", "900"], subsets: ["latin"] });
const serif = `${playfair.fontFamily}, Georgia, serif`;
const sans = `${inter.fontFamily}, sans-serif`;
const mono = `${fira.fontFamily}, monospace`;

const pop = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Largest font (<= max) at which `text` fits `width` (Inter 800 averages ~0.6em per glyph). */
const fit = (text: string, width: number, max: number, min = 20) =>
  Math.max(min, Math.min(max, Math.floor(width / (0.6 * Math.max(1, text.length)))));

/** Shared pop-in wrapper so every panel enters the same way. */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, 2);
  return (
    <g transform={`translate(${PANEL.x},${PANEL.y + (1 - s) * 40})`} opacity={Math.min(1, s * 2)}>{children}</g>
  );
};

interface Common { theme: Theme; accent: string }

// ── Compare (versus / before-after cards) ───────────────────────────────────
export const ComparePanel: React.FC<{ spec: CompareSpec } & Common> = ({ spec, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = spec.cards.length;
  const gap = spec.mode === "beforeAfter" ? 110 : 40;
  const cardW = (PANEL.w - gap * (n - 1)) / n;
  const cardH = 560;
  const top = (PANEL.h - cardH) / 2;
  const { red, green } = theme.accents;
  return (
    <Shell>
      {spec.cards.map((c, i) => {
        const p = pop(frame, fps, 6 + i * 10);
        const ba = spec.mode === "beforeAfter";
        const tone = ba ? (i === 0 ? red : green) : c.winner ? green : accent;
        const x = i * (cardW + gap);
        const maxLen = Math.max(1, ...c.points.map((q) => q.length));
        const pf = Math.min(38, Math.max(24, Math.floor((cardW - 110) / (0.58 * maxLen))));
        return (
          <g key={i} transform={`translate(${x},${top + (1 - p) * 50})`} opacity={clamp01(p * 2)}>
            <rect width={cardW} height={cardH} rx={30} fill={theme.bg} stroke={c.winner ? green : theme.ink} strokeWidth={c.winner ? 10 : 7} />
            <rect width={cardW} height={110} rx={30} fill={tone} />
            <rect y={70} width={cardW} height={40} fill={tone} />
            <text x={cardW / 2} y={72} textAnchor="middle" fontSize={fit(c.title, cardW - 60, 54, 30)} fontWeight={800} fontFamily={sans} fill="#fff">{c.title}</text>
            {c.points.map((q, j) => {
              const t = clamp01(interpolate(frame, [18 + i * 10 + j * 12, 30 + i * 10 + j * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
              return (
                <g key={j} opacity={t} transform={`translate(40,${170 + j * 88 + (1 - t) * 14})`}>
                  <circle cx={14} cy={-10} r={12} fill={tone} />
                  <text x={44} y={0} fontSize={pf} fontWeight={800} fontFamily={sans} fill={theme.ink}>{q}</text>
                </g>
              );
            })}
            {c.winner && (
              <g transform={`translate(${cardW / 2},${cardH + 6})`}>
                <rect x={-96} y={-34} width={192} height={52} rx={26} fill={green} />
                <text y={4} textAnchor="middle" fontSize={30} fontWeight={800} fontFamily={sans} fill="#fff">✓ BEST PICK</text>
              </g>
            )}
            {ba && i < n - 1 && (
              <g transform={`translate(${cardW + gap / 2},${cardH / 2})`} opacity={clamp01(pop(frame, fps, 24) * 2)}>
                <path d="M-34,0 H26 M6,-24 L34,0 L6,24" fill="none" stroke={theme.ink} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        );
      })}
    </Shell>
  );
};

// ── Flow (architecture diagram with a travelling request) ───────────────────
export const FlowPanel: React.FC<{ spec: FlowSpec; durationFrames: number } & Common> = ({ spec, durationFrames, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = spec.nodes.length;
  const horizontal = n <= 3;
  const nodeW = horizontal ? Math.min(340, (PANEL.w - 160) / n - 70) : 480;
  const nodeH = horizontal ? 150 : Math.min(104, (PANEL.h - 60) / n - 34);
  const centers = spec.nodes.map((_, i) =>
    horizontal
      ? { x: 80 + nodeW / 2 + i * ((PANEL.w - 160 - nodeW) / (n - 1)), y: PANEL.h / 2 }
      : { x: PANEL.w / 2, y: 30 + nodeH / 2 + i * ((PANEL.h - 60 - nodeH) / (n - 1)) },
  );
  const end = spec.active !== undefined ? Math.min(spec.active, n - 1) : n - 1;
  // forward over the first 55% of the scene (min 70 frames), then hold or return
  const travel = Math.max(70, durationFrames * 0.55) / Math.max(1, end || 1);
  const forward = (frame - 14) / (travel * Math.max(1, end));
  let pos: number;
  if (spec.active !== undefined) pos = clamp01(forward) * end;
  else {
    const cyc = ((forward % 2) + 2) % 2;
    pos = (cyc <= 1 ? cyc : 2 - cyc) * (n - 1);
  }
  pos = frame < 14 ? 0 : pos;
  const lo = Math.min(n - 2, Math.max(0, Math.floor(pos)));
  const f = pos - lo;
  const px = centers[lo].x + (centers[lo + 1].x - centers[lo].x) * f;
  const py = centers[lo].y + (centers[lo + 1].y - centers[lo].y) * f;
  const nearest = Math.round(pos);
  return (
    <Shell>
      {centers.slice(0, -1).map((c, i) => {
        const d = centers[i + 1];
        const vx = d.x - c.x, vy = d.y - c.y, len = Math.hypot(vx, vy) || 1;
        const ux = vx / len, uy = vy / len;
        const gapA = horizontal ? nodeW / 2 : nodeH / 2, gapB = gapA;
        const x1 = c.x + ux * (gapA + 6), y1 = c.y + uy * (gapA + 6);
        const x2 = d.x - ux * (gapB + 6), y2 = d.y - uy * (gapB + 6);
        const a = clamp01(pop(frame, fps, 8 + i * 8) * 2);
        return (
          <g key={i} opacity={a}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.ink} strokeWidth={9} strokeLinecap="round" />
            <path d={`M${x2 - ux * 26 - uy * 18},${y2 - uy * 26 + ux * 18} L${x2},${y2} L${x2 - ux * 26 + uy * 18},${y2 - uy * 26 - ux * 18}`} fill="none" stroke={theme.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
      {frame >= 14 && (
        <g transform={`translate(${px},${py})`}>
          <circle r={26} fill={theme.accents.gold} stroke={theme.ink} strokeWidth={6} />
        </g>
      )}
      {spec.nodes.map((label, i) => {
        const p = pop(frame, fps, 4 + i * 8);
        const hot = i === nearest && frame >= 14;
        return (
          <g key={i} transform={`translate(${centers[i].x},${centers[i].y}) scale(${Math.max(0.001, p)})`} opacity={clamp01(p * 2)}>
            <rect x={-nodeW / 2} y={-nodeH / 2} width={nodeW} height={nodeH} rx={26} fill={hot ? accent : theme.bg} stroke={theme.ink} strokeWidth={7} />
            <text y={fit(label, nodeW - 40, horizontal ? 46 : 52, 24) * 0.34} textAnchor="middle" fontSize={fit(label, nodeW - 40, horizontal ? 46 : 52, 24)} fontWeight={800} fontFamily={sans} fill={hot ? "#fff" : theme.ink}>{label}</text>
          </g>
        );
      })}
      {frame >= 14 && (
        <g transform={`translate(${px},${py})`}>
          {spec.packet && (() => {
            // label sits beside the packet, clear of the node text: right of the node (vertical) or above it (horizontal)
            const avail = horizontal ? PANEL.w : PANEL.w - (centers[0].x + nodeW / 2) - 36;
            const fs = Math.min(32, Math.floor((avail - 44) / (0.6 * spec.packet.length)));
            const w = spec.packet.length * fs * 0.6 + 44;
            const dx = horizontal ? 0 : nodeW / 2 + 24 + w / 2 - 0;
            const dy = horizontal ? -(nodeH / 2 + 36) : 0;
            return (
              <g transform={`translate(${dx},${dy})`}>
                <rect x={-w / 2} y={-30} width={w} height={56} rx={28} fill={theme.ink} />
                <text y={fs * 0.34} textAnchor="middle" fontSize={fs} fontWeight={800} fontFamily={mono} fill={theme.bg}>{spec.packet}</text>
              </g>
            );
          })()}
        </g>
      )}
    </Shell>
  );
};

// ── Terminal ────────────────────────────────────────────────────────────────
export const TerminalPanel: React.FC<{ spec: TerminalSpec; durationFrames: number } & Common> = ({ spec, durationFrames, accent }) => {
  const frame = useCurrentFrame();
  const n = spec.lines.length;
  const maxLen = Math.max(...spec.lines.map((l) => l.length), 1);
  const lineH = Math.max(52, Math.min(70, Math.floor((PANEL.h - 170) / n)));
  const fontSize = Math.floor(Math.min(lineH * 0.7, (PANEL.w - 110) / (0.6 * maxLen)));
  // commands take longer to type than output takes to appear
  const weights = spec.lines.map((l) => (l.startsWith("$ ") ? 2.4 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(30, durationFrames * 0.7);
  let acc = 8;
  const slots = weights.map((w) => { const start = acc; acc += (w / total) * span; return { start, len: (w / total) * span }; });
  let cursorAt = 0;
  return (
    <Shell>
      <rect width={PANEL.w} height={PANEL.h} rx={26} fill="#0D1117" stroke="#0B0B0B" strokeWidth={6} />
      <rect width={PANEL.w} height={64} rx={26} fill="#1F2430" />
      <rect y={40} width={PANEL.w} height={24} fill="#1F2430" />
      {["#FF5F56", "#FFBD2E", "#27C93F"].map((c, i) => <circle key={c} cx={38 + i * 34} cy={32} r={10} fill={c} />)}
      <text x={PANEL.w / 2} y={43} textAnchor="middle" fontSize={28} fontWeight={800} fontFamily={sans} fill="#9AA6BD">{spec.title ?? "terminal"}</text>
      <g transform={`translate(44,${100 + lineH * 0.75})`}>
        {spec.lines.map((line, i) => {
          const cmd = line.startsWith("$ ");
          const t = clamp01((frame - slots[i].start) / slots[i].len);
          const shown = cmd ? line.slice(0, Math.ceil(line.length * t)) : line;
          if (t > 0) cursorAt = i;
          const color = cmd ? "#E6EDF7" : /error|fail|exception/i.test(line) ? "#FF7B72" : /success|started|ready|ok\b|✓/i.test(line) ? "#7FD18B" : "#9AA6BD";
          return (
            <g key={i} opacity={cmd ? (t > 0 ? 1 : 0) : clamp01(t * 4)} transform={`translate(0,${i * lineH})`}>
              <text fontSize={fontSize} fontFamily={mono} style={{ whiteSpace: "pre" }} xmlSpace="preserve" fill={color}>
                {cmd && <tspan fill={accent}>$ </tspan>}{cmd ? shown.slice(2) : shown}
              </text>
            </g>
          );
        })}
        {Math.floor(frame / 12) % 2 === 0 && (
          <rect x={0} y={cursorAt * lineH - fontSize * 0.82} width={fontSize * 0.6} height={fontSize} fill="#E6EDF7" opacity={0.8} transform={`translate(${Math.min(PANEL.w - 140, (spec.lines[cursorAt].length + 1) * fontSize * 0.6 * (spec.lines[cursorAt].startsWith("$ ") ? clamp01((frame - slots[cursorAt].start) / slots[cursorAt].len) : 1))},0)`} />
        )}
      </g>
    </Shell>
  );
};

// ── Browser (page or API response) ──────────────────────────────────────────
export const BrowserPanel: React.FC<{ spec: BrowserSpec } & Common> = ({ spec, theme, accent }) => {
  const frame = useCurrentFrame();
  const json = spec.kind === "json";
  const n = spec.lines.length;
  const bodyTop = 160;
  const bodyH = PANEL.h - bodyTop - 30;
  const rowH = json ? Math.max(48, Math.min(64, Math.floor(bodyH / n))) : Math.max(70, Math.min(96, Math.floor((bodyH - (spec.heading ? 100 : 0)) / n)));
  const maxLen = Math.max(...spec.lines.map((l) => l.length), 1);
  const fontSize = Math.floor(Math.min(rowH * (json ? 0.7 : 0.5), (PANEL.w - 150) / ((json ? 0.6 : 0.58) * maxLen)));
  return (
    <Shell>
      <rect width={PANEL.w} height={PANEL.h} rx={26} fill={json ? "#0D1117" : theme.bg} stroke={theme.ink} strokeWidth={7} />
      <rect width={PANEL.w} height={110} rx={26} fill={theme.ink} />
      <rect y={70} width={PANEL.w} height={40} fill={theme.ink} />
      {["#FF5F56", "#FFBD2E", "#27C93F"].map((c, i) => <circle key={c} cx={44 + i * 36} cy={55} r={11} fill={c} />)}
      <rect x={190} y={22} width={PANEL.w - 240} height={66} rx={33} fill={theme.bg} opacity={0.14} />
      <text x={226} y={66} fontSize={fit(spec.url, PANEL.w - 330, 34, 22)} fontWeight={800} fontFamily={mono} fill={theme.bg}>{spec.url}</text>
      {spec.heading && !json && (
        <text x={60} y={bodyTop + 54} fontSize={fit(spec.heading, PANEL.w - 120, 62, 34)} fontWeight={800} fontFamily={sans} fill={theme.ink}>{spec.heading}</text>
      )}
      <g transform={`translate(0,${bodyTop + (spec.heading && !json ? 100 : 0)})`}>
        {spec.lines.map((line, i) => {
          const t = clamp01(interpolate(frame, [12 + i * 9, 24 + i * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
          if (json) {
            const m = line.match(/^(\s*)("[^"]+")(\s*:\s*)(.*)$/);
            return (
              <text key={i} x={50} y={i * rowH + rowH * 0.72} fontSize={fontSize} fontFamily={mono} style={{ whiteSpace: "pre" }} xmlSpace="preserve" opacity={t}>
                {m ? (<><tspan fill="#E6EDF7">{m[1]}</tspan><tspan fill="#F5B419">{m[2]}</tspan><tspan fill="#E6EDF7">{m[3]}</tspan><tspan fill={/^["']/.test(m[4]) ? "#7FD18B" : "#6CC4FF"}>{m[4]}</tspan></>) : <tspan fill="#E6EDF7">{line}</tspan>}
              </text>
            );
          }
          return (
            <g key={i} opacity={t} transform={`translate(0,${i * rowH + (1 - t) * 16})`}>
              <rect x={50} y={4} width={PANEL.w - 100} height={rowH - 16} rx={18} fill={theme.faint} />
              <rect x={50} y={4} width={12} height={rowH - 16} rx={6} fill={accent} />
              <text x={90} y={rowH * 0.62} fontSize={fontSize} fontWeight={800} fontFamily={sans} fill={theme.ink}>{line}</text>
            </g>
          );
        })}
      </g>
    </Shell>
  );
};

// ── Counter (big count-up numbers) ──────────────────────────────────────────
const group = (n: number, decimals: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const CounterPanel: React.FC<{ spec: CounterSpec; durationFrames: number } & Common> = ({ spec, durationFrames, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = spec.items.length;
  const gap = 36;
  const cardW = (PANEL.w - gap * (n - 1)) / n;
  const cardH = 520;
  const top = (PANEL.h - cardH) / 2;
  const span = Math.max(30, durationFrames * 0.55);
  return (
    <Shell>
      {spec.items.map((it, i) => {
        const p = pop(frame, fps, 6 + i * 10);
        const t = 1 - Math.pow(1 - clamp01((frame - 12 - i * 8) / span), 3); // ease-out
        const val = it.from + (it.value - it.from) * t;
        const text = `${it.prefix}${group(val, spec.decimals)}${it.suffix}`;
        const full = `${it.prefix}${group(it.value, spec.decimals)}${it.suffix}`;
        return (
          <g key={i} transform={`translate(${i * (cardW + gap)},${top + (1 - p) * 50})`} opacity={clamp01(p * 2)}>
            <rect width={cardW} height={cardH} rx={32} fill={theme.bg} stroke={theme.ink} strokeWidth={7} />
            <rect x={36} y={cardH - 120} width={cardW - 72} height={10} rx={5} fill={theme.faint} />
            <rect x={36} y={cardH - 120} width={(cardW - 72) * t} height={10} rx={5} fill={accent} />
            <text x={cardW / 2} y={cardH / 2 + 30} textAnchor="middle" fontSize={fit(full, cardW - 110, 170, 60)} fontWeight={800} fontFamily={sans} fill={accent}>{text}</text>
            <text x={cardW / 2} y={cardH - 52} textAnchor="middle" fontSize={fit(it.label, cardW - 60, 48, 24)} fontWeight={800} fontFamily={sans} fill={theme.ink}>{it.label}</text>
          </g>
        );
      })}
    </Shell>
  );
};

// ── Chart (bars or line) ────────────────────────────────────────────────────
export const ChartPanel: React.FC<{ spec: ChartSpec } & Common> = ({ spec, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = spec.values.length;
  const max = Math.max(...spec.values, 1);
  const plot = { x: 90, y: spec.title ? 150 : 90, w: PANEL.w - 180, h: PANEL.h - (spec.title ? 150 : 90) - 130 };
  const slot = plot.w / n;
  const px = (i: number) => plot.x + slot * i + slot / 2;
  const py = (v: number) => plot.y + plot.h - (v / max) * plot.h;
  const hl = spec.highlight;
  const growth = (i: number) => clamp01(pop(frame, fps, 10 + i * 8));
  const lineProgress = clamp01((frame - 10) / 50);
  const pts = spec.values.map((v, i) => `${px(i)},${plot.y + plot.h - (v / max) * plot.h * lineProgress}`);
  return (
    <Shell>
      <rect width={PANEL.w} height={PANEL.h} rx={30} fill={theme.bg} stroke={theme.ink} strokeWidth={7} />
      {spec.title && <text x={PANEL.w / 2} y={96} textAnchor="middle" fontSize={fit(spec.title, PANEL.w - 160, 56, 30)} fontWeight={800} fontFamily={sans} fill={theme.ink}>{spec.title}</text>}
      <line x1={plot.x - 20} x2={plot.x + plot.w + 20} y1={plot.y + plot.h} y2={plot.y + plot.h} stroke={theme.ink} strokeWidth={8} strokeLinecap="round" />
      {spec.kind === "bar" ? spec.values.map((v, i) => {
        const g = growth(i);
        const bw = Math.min(150, slot * 0.6);
        const h = (v / max) * plot.h * g;
        const on = hl === undefined || hl === i;
        return (
          <g key={i} opacity={on ? 1 : 0.5}>
            <rect x={px(i) - bw / 2} y={plot.y + plot.h - h} width={bw} height={h} rx={14} fill={hl === i ? accent : on ? accent : theme.ink} fillOpacity={hl === undefined || hl === i ? 1 : 0.35} stroke={theme.ink} strokeWidth={5} />
            <text x={px(i)} y={plot.y + plot.h - h - 18} textAnchor="middle" fontSize={40} fontWeight={800} fontFamily={sans} fill={theme.ink} opacity={g}>{v}{spec.unit}</text>
            <text x={px(i)} y={plot.y + plot.h + 62} textAnchor="middle" fontSize={fit(spec.labels[i] ?? "", slot - 20, 38, 20)} fontWeight={800} fontFamily={sans} fill={theme.ink}>{spec.labels[i]}</text>
          </g>
        );
      }) : (
        <>
          <polyline points={pts.join(" ")} fill="none" stroke={accent} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          {spec.values.map((v, i) => {
            const g = clamp01((lineProgress * (n - 1) - (i - 1)) );
            return (
              <g key={i} opacity={g}>
                <circle cx={px(i)} cy={py(v) + (plot.y + plot.h - py(v)) * (1 - lineProgress)} r={hl === i ? 22 : 15} fill={hl === i ? accent : theme.bg} stroke={theme.ink} strokeWidth={6} />
                <text x={px(i)} y={py(v) - 34} textAnchor="middle" fontSize={38} fontWeight={800} fontFamily={sans} fill={theme.ink}>{v}{spec.unit}</text>
                <text x={px(i)} y={plot.y + plot.h + 62} textAnchor="middle" fontSize={fit(spec.labels[i] ?? "", slot - 20, 38, 20)} fontWeight={800} fontFamily={sans} fill={theme.ink}>{spec.labels[i]}</text>
              </g>
            );
          })}
        </>
      )}
    </Shell>
  );
};

// ── Progress bars ───────────────────────────────────────────────────────────
export const ProgressPanel: React.FC<{ spec: ProgressSpec; durationFrames: number } & Common> = ({ spec, durationFrames, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = spec.items.length;
  const rowH = Math.min(150, (PANEL.h - 40) / n);
  const top = (PANEL.h - n * rowH) / 2;
  const span = Math.max(30, durationFrames * 0.5);
  return (
    <Shell>
      {spec.items.map((it, i) => {
        const p = pop(frame, fps, 4 + i * 8);
        const t = 1 - Math.pow(1 - clamp01((frame - 12 - i * 8) / span), 3);
        const w = PANEL.w - 140;
        return (
          <g key={i} transform={`translate(70,${top + i * rowH})`} opacity={clamp01(p * 2)}>
            <text y={rowH * 0.34} fontSize={fit(it.label, w - 200, 50, 28)} fontWeight={800} fontFamily={sans} fill={theme.ink}>{it.label}</text>
            <text x={w} y={rowH * 0.34} textAnchor="end" fontSize={50} fontWeight={800} fontFamily={sans} fill={accent}>{Math.round(it.value * t)}%</text>
            <rect y={rowH * 0.48} width={w} height={rowH * 0.26} rx={rowH * 0.13} fill={theme.faint} stroke={theme.ink} strokeWidth={5} />
            <rect y={rowH * 0.48} width={Math.max(rowH * 0.26, (w * it.value * t) / 100)} height={rowH * 0.26} rx={rowH * 0.13} fill={accent} stroke={theme.ink} strokeWidth={5} />
          </g>
        );
      })}
    </Shell>
  );
};

// ── Table (database rows) ───────────────────────────────────────────────────
export const TablePanel: React.FC<{ spec: TableSpec } & Common> = ({ spec, theme, accent }) => {
  const frame = useCurrentFrame();
  const cols = spec.columns.length;
  const rows = spec.rows.length;
  const nameH = spec.name ? 96 : 0;
  const rowH = Math.min(100, (PANEL.h - 80 - nameH) / (rows + 1));
  const w = PANEL.w - 100;
  const colW = w / cols;
  const longest = Math.max(1, ...spec.columns.map((c) => c.length), ...spec.rows.flat().map((c) => c.length));
  const fontSize = Math.floor(Math.min(rowH * 0.46, (colW - 24) / (0.6 * longest)));
  const top = (PANEL.h - nameH - (rows + 1) * rowH) / 2 + nameH;
  return (
    <Shell>
      {spec.name && (
        <g transform={`translate(50,${top - nameH + 20})`}>
          <rect width={Math.max(220, spec.name.length * 26 + 90)} height={64} rx={32} fill={theme.ink} />
          <text x={34} y={44} fontSize={34} fontWeight={800} fontFamily={mono} fill={theme.bg}>🗄 {spec.name}</text>
        </g>
      )}
      <g transform={`translate(50,${top})`}>
        <rect width={w} height={rowH} rx={18} fill={accent} stroke={theme.ink} strokeWidth={6} />
        {spec.columns.map((c, i) => (
          <text key={i} x={i * colW + colW / 2} y={rowH * 0.66} textAnchor="middle" fontSize={fontSize} fontWeight={800} fontFamily={sans} fill="#fff">{c}</text>
        ))}
        {spec.rows.map((r, ri) => {
          const t = clamp01(interpolate(frame, [12 + ri * 10, 24 + ri * 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
          const hot = spec.highlightRow === ri;
          return (
            <g key={ri} opacity={t} transform={`translate(0,${(ri + 1) * rowH + (1 - t) * 14})`}>
              <rect y={4} width={w} height={rowH - 8} rx={14} fill={hot ? accent : ri % 2 ? theme.bg : theme.faint} fillOpacity={hot ? 0.28 : 1} stroke={hot ? accent : theme.ink} strokeWidth={hot ? 8 : 4} />
              {r.map((cell, ci) => (
                <text key={ci} x={ci * colW + colW / 2} y={rowH * 0.64} textAnchor="middle" fontSize={fontSize} fontWeight={800} fontFamily={mono} fill={theme.ink}>{cell}</text>
              ))}
            </g>
          );
        })}
      </g>
    </Shell>
  );
};

// ── Alert (error / success / warning state) ─────────────────────────────────
export const AlertPanel: React.FC<{ spec: AlertSpec } & Common> = ({ spec, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = spec.kind === "error" ? theme.accents.red : spec.kind === "success" ? theme.accents.green : theme.accents.gold;
  const icon = spec.kind === "error" ? "✕" : spec.kind === "success" ? "✓" : "!";
  const p = pop(frame, fps, 6);
  const shake = spec.kind === "error" && frame < 22 ? Math.sin(frame * 1.8) * (22 - frame) * 0.9 : 0;
  return (
    <Shell>
      <g transform={`translate(${shake},0)`}>
        <rect y={110} width={PANEL.w} height={PANEL.h - 220} rx={36} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={12} />
        <g transform={`translate(${PANEL.w / 2},${PANEL.h / 2 - 90}) scale(${Math.max(0.001, p)})`}>
          <circle r={96} fill={color} stroke={theme.ink} strokeWidth={8} />
          <text y={42} textAnchor="middle" fontSize={130} fontWeight={800} fontFamily={sans} fill="#fff">{icon}</text>
        </g>
        <text x={PANEL.w / 2} y={PANEL.h / 2 + 100} textAnchor="middle" fontSize={fit(spec.title, PANEL.w - 140, 78, 40)} fontWeight={800} fontFamily={sans} fill={theme.ink} opacity={clamp01(p * 2)}>{spec.title}</text>
        {spec.detail && (
          <text x={PANEL.w / 2} y={PANEL.h / 2 + 180} textAnchor="middle" fontSize={fit(spec.detail, PANEL.w - 160, 42, 26)} fontWeight={800} fontFamily={mono} fill={theme.ink} opacity={clamp01((frame - 14) / 10) * 0.75}>{spec.detail}</text>
        )}
      </g>
    </Shell>
  );
};

// ── Svg (AI-drawn diagram from the shape language) ──────────────────────────
export const SvgPanel: React.FC<{ spec: SvgSpec; durationFrames: number } & Common> = ({ spec, durationFrames, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = (c: string | undefined, fallback: string): string => {
    if (!c) return fallback;
    if (c === "ink") return theme.ink;
    if (c === "accent") return accent;
    if (c === "bg") return theme.bg;
    if (c === "white") return "#FFFFFF";
    if (c === "faint") return theme.faint;
    if (c === "red" || c === "green" || c === "blue" || c === "gold") return theme.accents[c];
    return c; // validated #rrggbb
  };
  const steps = spec.shapes.map((sh, i) => sh.step ?? i);
  const maxStep = Math.max(...steps, 0);
  const stagger = Math.min(14, Math.max(4, Math.floor((durationFrames * 0.55) / (maxStep + 1))));
  const body = spec.shapes.map((sh: Shape, i) => {
    const start = 8 + steps[i] * stagger;
    const p = pop(frame, fps, start);
    const t = clamp01((frame - start) / 14); // linear 0..1 for draw-on
    const sw = sh.sw ?? 6;
    const stroke = color(sh.stroke, theme.ink);
    switch (sh.t) {
      case "rect":
        return <rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.rx ?? 14} fill={color(sh.fill, "none")} fillOpacity={sh.fill ? 1 : 0} stroke={stroke} strokeWidth={sw} opacity={clamp01(p * 2)} transform={`translate(0,${(1 - p) * 20})`} />;
      case "circle":
        return <circle key={i} cx={sh.cx} cy={sh.cy} r={Math.max(0.5, sh.r * p)} fill={color(sh.fill, "none")} stroke={stroke} strokeWidth={sw} opacity={clamp01(p * 2)} />;
      case "line": {
        const dx = sh.x2 - sh.x1, dy = sh.y2 - sh.y1, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const head = 28;
        return (
          <g key={i}>
            <line x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round"
              {...(sh.dash ? { strokeDasharray: "18 14" } : { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - t })} opacity={sh.dash ? clamp01(t * 2) : 1} />
            {sh.arrow && (
              <path d={`M${sh.x2 - ux * head - uy * head * 0.6},${sh.y2 - uy * head + ux * head * 0.6} L${sh.x2},${sh.y2} L${sh.x2 - ux * head + uy * head * 0.6},${sh.y2 - uy * head - ux * head * 0.6}`}
                fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((t - 0.7) * 4)} />
            )}
          </g>
        );
      }
      case "path":
        return <path key={i} d={sh.d} fill={color(sh.fill, "none")} fillOpacity={sh.fill ? 1 : 0} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={sh.fill ? 0 : 1 - t} opacity={sh.fill ? clamp01(p * 2) : 1} />;
      case "text":
        return <text key={i} x={sh.x} y={sh.y} textAnchor={sh.anchor} fontSize={sh.size} fontWeight={800} fontFamily={sans} fill={color(sh.fill, theme.ink)} opacity={clamp01(p * 2)} transform={`translate(0,${(1 - p) * 14})`}>{sh.text}</text>;
    }
  });
  return (
    <Shell>
      {spec.title && <text x={PANEL.w / 2} y={52} textAnchor="middle" fontSize={fit(spec.title, PANEL.w - 160, 52, 28)} fontWeight={800} fontFamily={sans} fill={theme.ink}>{spec.title}</text>}
      {body}
    </Shell>
  );
};

// ── News (newspaper clipping: masthead, headline with highlighted words, optional stamp) ───────
/** Greedy word wrap using an average serif glyph width (Playfair 900 is ~0.52em per glyph). */
const wrapWords = (text: string, size: number, width: number): string[][] => {
  const lines: string[][] = [[]];
  let w = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const ww = (word.length + 1) * size * 0.52;
    if (w + ww > width && lines[lines.length - 1].length) { lines.push([]); w = 0; }
    lines[lines.length - 1].push(word);
    w += ww;
  }
  return lines;
};

export const NewsPanel: React.FC<{ spec: NewsSpec } & Common> = ({ spec, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paper = "#F3ECDD";
  const ink = "#1A1712";
  const W = PANEL.w - 160, X0 = 80, H = PANEL.h - 70;
  const innerW = W - 100;
  // headline: the largest size (<= 74) that wraps into at most 4 lines
  let size = 74, lines = wrapWords(spec.headline, size, innerW);
  while (lines.length > 4 && size > 40) { size -= 4; lines = wrapWords(spec.headline, size, innerW); }
  const lineH = size * 1.18;
  const markWords = new Set((spec.mark ?? "").toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/[^a-z0-9]/g, "")));
  const enter = pop(frame, fps, 3);
  const tilt = -1.2 + (1 - enter) * 4;
  const headTop = 235;
  const stampP = pop(frame, fps, 22);
  const red = theme.accents.red;
  return (
    <Shell>
      <g transform={`translate(${X0 + W / 2},${35 + H / 2}) rotate(${tilt}) scale(${0.94 + enter * 0.06}) translate(${-W / 2},${-H / 2})`}>
        <rect x={10} y={14} width={W} height={H} rx={6} fill="#000" opacity={0.18} />
        <rect width={W} height={H} rx={6} fill={paper} stroke={ink} strokeWidth={3} />
        <text x={W / 2} y={84} textAnchor="middle" fontSize={fit(spec.outlet, W - 160, 76, 36)} fontWeight={900} fontFamily={serif} fill={ink}>{spec.outlet}</text>
        <rect x={40} y={104} width={W - 80} height={4} fill={ink} />
        <rect x={40} y={114} width={W - 80} height={1.5} fill={ink} />
        {spec.date && <text x={46} y={156} fontSize={26} fontWeight={700} fontFamily={serif} fill={ink} opacity={0.7}>{spec.date.toUpperCase()}</text>}
        {lines.map((ln, li) => {
          const y = headTop + 40 + li * lineH;
          const lp = clamp01((frame - 8 - li * 5) / 10);
          return (
            <text key={li} x={50} y={y} fontSize={size} fontWeight={900} fontFamily={serif} fill={ink} opacity={lp} transform={`translate(0,${(1 - lp) * 14})`}>
              {ln.map((word, wi) => {
                const hit = markWords.has(word.toLowerCase().replace(/[^a-z0-9]/g, ""));
                const k = clamp01((frame - 24 - li * 4 - wi * 2) / 8);
                return <tspan key={wi} fill={hit ? red : ink} fillOpacity={hit ? 0.35 + 0.65 * k : 1}>{word}{wi < ln.length - 1 ? " " : ""}</tspan>;
              })}
            </text>
          );
        })}
        {spec.deck && (
          <text x={50} y={headTop + 40 + lines.length * lineH + 20} fontSize={fit(spec.deck, innerW, 34, 22)} fontWeight={700} fontFamily={serif} fill={ink} opacity={clamp01((frame - 16) / 12) * 0.78}>{spec.deck}</text>
        )}
        {spec.stamp && (
          <g transform={`translate(${W - 230},152) rotate(-7) scale(${Math.max(0.001, 1.6 - stampP * 0.6)})`} opacity={clamp01(stampP * 1.5)}>
            <rect x={-150} y={-36} width={300} height={72} rx={8} fill={paper} fillOpacity={0.85} stroke={red} strokeWidth={8} />
            <text textAnchor="middle" y={19} fontSize={fit(spec.stamp, 260, 50, 26)} fontWeight={900} fontFamily={sans} fill={red}>{spec.stamp.toUpperCase()}</text>
          </g>
        )}
      </g>
    </Shell>
  );
};
