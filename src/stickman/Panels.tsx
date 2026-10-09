import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadFiraCode } from "@remotion/google-fonts/FiraCode";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import type { CodeSpec, ContainerSpec, QuizSpec, StepsSpec } from "./schema";
import type { Theme } from "./theme";
import { PANEL } from "./PanelGeometry";
import { sliceTokens, tokenizeLine, type TokKind } from "./code";

const fira = loadFiraCode("normal", { weights: ["500"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["800"], subsets: ["latin"] });
const sans = `${inter.fontFamily}, sans-serif`;

export { PANEL };

const pop = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });

// ── Code ────────────────────────────────────────────────────────────────────
const CODE_COLORS: Record<TokKind, string> = {
  ann: "#F5B419", kw: "#C792EA", str: "#7FD18B", com: "#7A869A", type: "#6CC4FF", plain: "#E6EDF7",
  key: "#82AAFF", num: "#F78C6C", tag: "#F07178", attr: "#FFCB6B", prompt: "#7FD18B",
};

export const CodePanel: React.FC<{ spec: CodeSpec; durationFrames: number; accent: string }> = ({ spec, durationFrames, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, 2);
  // Fit the text to the panel: bigger for short snippets, capped by the widest line. Up to 14 lines always fit.
  const maxLen = Math.max(...spec.lines.map((l) => l.length), 1);
  const lineH = Math.max(36, Math.min(66, Math.floor((PANEL.h - 130) / spec.lines.length)));
  const fontSize = Math.floor(Math.min(lineH * 0.76, (PANEL.w - 100) / (0.6 * maxLen)));
  const charW = fontSize * 0.6; // Fira Code is 0.6em wide
  const first = Math.min(spec.revealFrom, spec.lines.length - 1); // lines before this are already on screen
  const newCount = spec.lines.length - first;
  const revealSpan = Math.max(20, durationFrames * 0.55);
  const per = revealSpan / newCount;
  // typing: new lines are typed one after another at a speed that finishes within the reveal span
  const typed = spec.animate === "type";
  const newChars = Math.max(1, spec.lines.slice(first).reduce((a, l) => a + l.length + 3, 0));
  const speed = Math.min(3.5, Math.max(0.6, newChars / (revealSpan * 0.9)));
  const startOf = (i: number) => 6 + spec.lines.slice(first, i).reduce((a, l) => a + (l.length + 3) / speed, 0);
  return (
    <g transform={`translate(${PANEL.x},${PANEL.y + (1 - s) * 40})`} opacity={Math.min(1, s * 2)}>
      <rect width={PANEL.w} height={PANEL.h} rx={26} fill="#1B1F2B" stroke="#0B0B0B" strokeWidth={6} />
      <rect width={PANEL.w} height={64} rx={26} fill="#262B3A" />
      <rect y={40} width={PANEL.w} height={24} fill="#262B3A" />
      {["#FF5F56", "#FFBD2E", "#27C93F"].map((c, i) => <circle key={c} cx={38 + i * 34} cy={32} r={10} fill={c} />)}
      {spec.title && (
        <text x={PANEL.w / 2} y={43} textAnchor="middle" fontSize={28} fontWeight={800} fontFamily={sans} fill="#9AA6BD">{spec.title}</text>
      )}
      <g transform={`translate(40,${96 + lineH * 0.8})`}>
        {spec.lines.map((line, i) => {
          const isNew = i >= first;
          const k = i - first;
          const toks = tokenizeLine(line, spec.language);
          let t = 1;
          let shown = toks;
          let caret = false;
          if (isNew && typed) {
            const chars = (frame - startOf(i)) * speed;
            t = chars <= 0 ? 0 : 1;
            shown = sliceTokens(toks, chars);
            caret = chars > 0 && chars < line.length + 3 || (frame - startOf(i) > 0 && i === spec.lines.length - 1 && Math.floor(frame / 15) % 2 === 0);
          } else if (isNew) {
            t = interpolate(frame, [6 + k * per, 6 + k * per + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          }
          // a highlight lights up once its line is on screen
          const hl = spec.highlight.includes(i);
          const slide = isNew && !typed ? (1 - t) * -24 : 0;
          return (
            <g key={i} opacity={isNew && typed ? (t > 0 ? 1 : 0) : t} transform={`translate(${slide},${i * lineH})`}>
              {hl && <rect x={-20} y={-lineH * 0.78} width={PANEL.w - 40} height={lineH} rx={8} fill={accent} opacity={0.28} />}
              {hl && <rect x={-20} y={-lineH * 0.78} width={8} height={lineH} rx={4} fill={accent} />}
              <text fontSize={fontSize} fontFamily={`${fira.fontFamily}, monospace`} style={{ whiteSpace: "pre" }} xmlSpace="preserve">
                {shown.map((tk, j) => <tspan key={j} fill={CODE_COLORS[tk.kind]}>{tk.text}</tspan>)}
              </text>
              {caret && <rect x={shown.reduce((a, tk) => a + tk.text.length, 0) * charW + 2} y={-fontSize * 0.82} width={Math.max(3, fontSize * 0.1)} height={fontSize * 1.05} fill="#E6EDF7" />}
            </g>
          );
        })}
      </g>
    </g>
  );
};

// ── Quiz ────────────────────────────────────────────────────────────────────
export const QuizPanel: React.FC<{ spec: QuizSpec; durationFrames: number; theme: Theme; accent: string }> = ({ spec, durationFrames, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, 2);
  const revealFrame = Math.round(durationFrames * spec.revealAt);
  const revealed = frame >= revealFrame;
  const timerStart = 14;
  const remaining = interpolate(frame, [timerStart, revealFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const green = theme.accents.green;
  const rowH = spec.options.length > 3 ? 126 : 148;
  const top = 250;
  return (
    <g transform={`translate(${PANEL.x},${PANEL.y + (1 - s) * 40})`} opacity={Math.min(1, s * 2)}>
      <rect width={PANEL.w} height={PANEL.h} rx={26} fill={theme.bg} stroke={theme.ink} strokeWidth={7} />
      <rect x={34} y={30} width={250} height={54} rx={27} fill={accent} />
      <text x={159} y={68} textAnchor="middle" fontSize={30} fontWeight={800} fontFamily={sans} fill="#fff">PAUSE &amp; THINK</text>
      <text x={PANEL.w - 40} y={68} textAnchor="end" fontSize={30} fontWeight={800} fontFamily={sans} fill={theme.ink} opacity={0.6}>
        {revealed ? "Answer" : "Thinking…"}
      </text>
      <text x={PANEL.w / 2} y={170} textAnchor="middle" fontSize={56} fontWeight={800} fontFamily={sans} fill={theme.ink}>{spec.question}</text>
      <rect x={60} y={196} width={(PANEL.w - 120) * remaining} height={10} rx={5} fill={accent} opacity={revealed ? 0 : 1} />
      {spec.options.map((opt, i) => {
        const o = pop(frame, fps, 8 + i * 5);
        const correct = i === spec.answer;
        const fill = revealed ? (correct ? green : theme.faint) : theme.faint;
        const textFill = revealed && correct ? "#fff" : theme.ink;
        return (
          <g key={i} transform={`translate(60,${top + i * rowH}) scale(${0.6 + 0.4 * o},1)`} opacity={revealed && !correct ? 0.45 : Math.min(1, o * 2)}>
            <rect width={PANEL.w - 120} height={rowH - 18} rx={20} fill={fill} />
            <circle cx={56} cy={(rowH - 18) / 2} r={32} fill={revealed && correct ? "#fff" : theme.ink} />
            <text x={56} y={(rowH - 18) / 2 + 14} textAnchor="middle" fontSize={40} fontWeight={800} fontFamily={sans} fill={revealed && correct ? green : theme.bg}>{"ABCD"[i]}</text>
            <text x={116} y={(rowH - 18) / 2 + 16} fontSize={46} fontWeight={800} fontFamily={sans} fill={textFill}>{opt}</text>
            {revealed && correct && <text x={PANEL.w - 200} y={(rowH - 18) / 2 + 18} fontSize={54} fontWeight={800} fontFamily={sans} fill="#fff">✓</text>}
          </g>
        );
      })}
    </g>
  );
};

// ── Container (beans inside the IoC container) ──────────────────────────────
export const ContainerPanel: React.FC<{ spec: ContainerSpec; theme: Theme; accent: string }> = ({ spec, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, 2);
  const longest = Math.max(...spec.beans.map((b) => b.length));
  const chipW = Math.max(360, longest * 25 + 150);
  const cols = Math.max(1, Math.min(spec.beans.length > 4 ? 3 : 2, Math.floor((PANEL.w - 80) / (chipW + 40))));
  const chipH = 118, gapX = 40, gapY = 40;
  const rows = Math.ceil(spec.beans.length / cols);
  const gridW = cols * chipW + (cols - 1) * gapX;
  const gridH = rows * chipH + (rows - 1) * gapY;
  const gx = (PANEL.w - gridW) / 2;
  const gy = 160 + (PANEL.h - 160 - gridH) / 2;
  return (
    <g transform={`translate(${PANEL.x},${PANEL.y + (1 - s) * 40})`} opacity={Math.min(1, s * 2)}>
      <rect width={PANEL.w} height={PANEL.h} rx={30} fill={accent} fillOpacity={0.08} stroke={accent} strokeWidth={8} strokeDasharray="26 16" />
      <text x={PANEL.w / 2} y={102} textAnchor="middle" fontSize={60} fontWeight={800} fontFamily={sans} fill={theme.ink}>{spec.label}</text>
      <path d={`M${PANEL.w / 2 - 180},128 H${PANEL.w / 2 + 180}`} stroke={accent} strokeWidth={8} strokeLinecap="round" />
      {spec.beans.map((b, i) => {
        const p = pop(frame, fps, 16 + i * 12);
        const cx = gx + (i % cols) * (chipW + gapX) + chipW / 2;
        const cy = gy + Math.floor(i / cols) * (chipH + gapY) + chipH / 2;
        return (
          <g key={b} transform={`translate(${cx},${cy}) scale(${Math.max(0.001, p)})`} opacity={Math.min(1, p * 2)}>
            <rect x={-chipW / 2} y={-chipH / 2} width={chipW} height={chipH} rx={chipH / 2} fill={theme.bg} stroke={theme.ink} strokeWidth={7} />
            <circle cx={-chipW / 2 + 62} cy={0} r={28} fill={accent} />
            <text x={-chipW / 2 + 62} y={13} textAnchor="middle" fontSize={36} fontWeight={800} fontFamily={sans} fill="#fff">B</text>
            <text x={-chipW / 2 + 112} y={14} fontSize={42} fontWeight={800} fontFamily={sans} fill={theme.ink}>{b}</text>
          </g>
        );
      })}
    </g>
  );
};

// ── Steps (numbered flow) ───────────────────────────────────────────────────
export const StepsPanel: React.FC<{ spec: StepsSpec; theme: Theme; accent: string }> = ({ spec, theme, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, 2);
  const n = spec.items.length;
  const rowH = Math.min(118, (PANEL.h - 40) / n);
  const top = (PANEL.h - n * rowH) / 2;
  const font = Math.floor(Math.max(40, Math.min(54, rowH * 0.5)));
  const green = theme.accents.green;
  return (
    <g transform={`translate(${PANEL.x},${PANEL.y + (1 - s) * 40})`} opacity={Math.min(1, s * 2)}>
      <path d={`M60,${top + rowH / 2} V${top + (n - 1) * rowH + rowH / 2}`} stroke={theme.faint} strokeWidth={10} strokeLinecap="round" />
      {spec.items.map((item, i) => {
        const done = i < spec.current;
        const active = i === spec.current;
        const y = top + i * rowH + rowH / 2;
        const f = done ? green : active ? accent : theme.faint;
        return (
          <g key={i} opacity={(done ? 0.75 : active ? 1 : 0.45) * Math.min(1, s * 2)}>
            {active && <rect x={16} y={y - rowH / 2 + 6} width={PANEL.w - 32} height={rowH - 12} rx={26} fill={accent} fillOpacity={0.14} stroke={accent} strokeWidth={6} />}
            <circle cx={60} cy={y} r={rowH * 0.3} fill={f} />
            <text x={60} y={y + font * 0.35} textAnchor="middle" fontSize={font * 0.9} fontWeight={800} fontFamily={sans} fill={done || active ? "#fff" : theme.ink}>{done ? "✓" : i + 1}</text>
            <text x={60 + rowH * 0.3 + 28} y={y + font * 0.35} fontSize={active ? font : font * 0.92} fontWeight={800} fontFamily={sans} fill={theme.ink}>{item}</text>
          </g>
        );
      })}
    </g>
  );
};
