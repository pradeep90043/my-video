import React from "react";
import { shade } from "./spec";

/**
 * Flat backgrounds, drawn for the frame size. Each has a ground line where people stand (`groundOf`), slow motion of its
 * own (rays turn, stars twinkle, clouds drift, windows glow) and an optional palette that retints it ([main, second]).
 */

export const groundOf = (kind: string, H: number): number => (kind === "space" || kind === "glow" || kind === "sunburst" || kind === "plain" || kind === "night" ? H * 0.93 : H * 0.88);

const rand = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const Stars: React.FC<{ W: number; H: number; t: number; n?: number; top?: number }> = ({ W, H, t, n = 70, top = 0.75 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + rand(i + 9)) + i));
      const big = rand(i + 3) > 0.9;
      const x = rand(i) * W, y = rand(i + 1) * H * top;
      return big
        ? <path key={i} d={`M ${x} ${y - 9} L ${x + 2.5} ${y - 2.5} L ${x + 9} ${y} L ${x + 2.5} ${y + 2.5} L ${x} ${y + 9} L ${x - 2.5} ${y + 2.5} L ${x - 9} ${y} L ${x - 2.5} ${y - 2.5} Z`} fill="#fff6d8" opacity={tw} />
        : <circle key={i} cx={x} cy={y} r={1.4 + rand(i + 2) * 1.8} fill="#ffffff" opacity={tw * 0.8} />;
    })}
  </g>
);

const Cloud: React.FC<{ x: number; y: number; k: number; fill?: string }> = ({ x, y, k, fill = "#ffffff" }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`} fill={fill}>
    <ellipse cx={0} cy={0} rx={90} ry={34} /><circle cx={-34} cy={-18} r={36} /><circle cx={20} cy={-30} r={46} /><circle cx={60} cy={-8} r={30} />
  </g>
);

const Grad: React.FC<{ id: string; a: string; b: string; c?: string }> = ({ id, a, b, c }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={a} /><stop offset={c ? "60%" : "100%"} stopColor={b} />{c && <stop offset="100%" stopColor={c} />}
  </linearGradient>
);

export const Background: React.FC<{ kind: string; W: number; H: number; t: number; palette?: string[]; uid: string }> = ({ kind, W, H, t, palette = [], uid }) => {
  const g = groundOf(kind, H);
  const p0 = palette[0], p1 = palette[1];
  const id = (s: string) => `${uid}-${s}`;
  switch (kind) {
    case "night": return (
      <g>
        <defs><Grad id={id("sky")} a={p0 ?? "#0b0f2e"} b={p1 ?? "#2a1d55"} c="#3a2462" /></defs>
        <rect width={W} height={H} fill={`url(#${id("sky")})`} />
        <Stars W={W} H={H} t={t} />
        <circle cx={W * 0.78} cy={H * 0.14} r={Math.min(W, H) * 0.07} fill="#fff4cf" opacity={0.95} />
        <circle cx={W * 0.78 + Math.min(W, H) * 0.035} cy={H * 0.14 - Math.min(W, H) * 0.02} r={Math.min(W, H) * 0.062} fill={p0 ?? "#141842"} />
      </g>
    );
    case "sunburst": {
      const cx = W / 2, cy = H * 0.42, R = Math.hypot(W, H);
      const a = p0 ?? "#f6b24a", b = p1 ?? "#f9d58a";
      return (
        <g>
          <defs><radialGradient id={id("sb")}><stop offset="0%" stopColor="#fff3cf" /><stop offset="45%" stopColor={b} /><stop offset="100%" stopColor={shade(a, -0.35)} /></radialGradient></defs>
          <rect width={W} height={H} fill={`url(#${id("sb")})`} />
          <g transform={`translate(${cx} ${cy}) rotate(${t * 6})`} opacity={0.35}>
            {Array.from({ length: 18 }, (_, i) => <path key={i} d={`M 0 0 L ${R * Math.cos((i * 20 - 4) * Math.PI / 180)} ${R * Math.sin((i * 20 - 4) * Math.PI / 180)} L ${R * Math.cos((i * 20 + 4) * Math.PI / 180)} ${R * Math.sin((i * 20 + 4) * Math.PI / 180)} Z`} fill={shade(a, -0.1)} />)}
          </g>
        </g>
      );
    }
    case "glow": {
      const c = p0 ?? "#8f1d1d";
      return (
        <g>
          <defs><radialGradient id={id("gl")} cx="50%" cy="45%"><stop offset="0%" stopColor={shade(c, 0.15)} /><stop offset="60%" stopColor={shade(c, -0.45)} /><stop offset="100%" stopColor={shade(c, -0.8)} /></radialGradient></defs>
          <rect width={W} height={H} fill={`url(#${id("gl")})`} />
          {[0, 1, 2, 3].map((i) => { const r = ((t * 60 + i * 140) % 560) + 120; return <circle key={i} cx={W / 2} cy={H * 0.45} r={r * Math.min(W, H) / 1080} fill="none" stroke={shade(c, 0.3)} strokeWidth={2} opacity={Math.max(0, 0.5 - r / 1300)} />; })}
        </g>
      );
    }
    case "sky": return (
      <g>
        <defs><Grad id={id("sky")} a={p0 ?? "#5fb6f2"} b={p1 ?? "#c9ecff"} /></defs>
        <rect width={W} height={H} fill={`url(#${id("sky")})`} />
        <circle cx={W * 0.8} cy={H * 0.13} r={Math.min(W, H) * 0.06} fill="#ffe27a" />
        {[0, 1, 2].map((i) => <Cloud key={i} x={((rand(i) * W + t * (10 + i * 6)) % (W + 300)) - 150} y={H * (0.12 + i * 0.09)} k={Math.min(W, H) / 1080 * (0.8 + rand(i + 4) * 0.6)} />)}
        <path d={`M 0 ${g - H * 0.1} Q ${W * 0.25} ${g - H * 0.2} ${W * 0.5} ${g - H * 0.1} Q ${W * 0.75} ${g - H * 0.02} ${W} ${g - H * 0.12} L ${W} ${H} L 0 ${H} Z`} fill="#8fd17e" />
        <rect y={g} width={W} height={H - g} fill="#6fbf62" />
      </g>
    );
    case "city": {
      const sky1 = p0 ?? "#26305e", sky2 = p1 ?? "#e0806a";
      return (
        <g>
          <defs><Grad id={id("sky")} a={sky1} b={sky2} /></defs>
          <rect width={W} height={H} fill={`url(#${id("sky")})`} />
          {[0, 1].map((layer) => {
            const n = layer ? 9 : 12, col = layer ? "#1f2440" : "#363d66";
            return Array.from({ length: n }, (_, i) => {
              const w = W / n, x = i * w, h = H * (layer ? 0.22 : 0.32) * (0.5 + rand(i + layer * 20));
              return (
                <g key={`${layer}-${i}`}>
                  <rect x={x + 4} y={g - h} width={w - 8} height={h} fill={col} />
                  {layer === 1 && Array.from({ length: 6 }, (_, k) => <rect key={k} x={x + 14 + (k % 2) * (w / 2 - 8)} y={g - h + 18 + Math.floor(k / 2) * 40} width={w / 4} height={16} fill="#ffd36e" opacity={0.4 + 0.5 * Math.abs(Math.sin(t * 0.7 + i + k))} />)}
                </g>
              );
            });
          })}
          <rect y={g} width={W} height={H - g} fill="#181b30" />
        </g>
      );
    }
    case "village": return (
      <g>
        <defs><Grad id={id("sky")} a={p0 ?? "#f7b267"} b={p1 ?? "#fbe3b4"} /></defs>
        <rect width={W} height={H} fill={`url(#${id("sky")})`} />
        <path d={`M 0 ${g - H * 0.12} Q ${W * 0.3} ${g - H * 0.22} ${W * 0.6} ${g - H * 0.12} T ${W} ${g - H * 0.14} L ${W} ${g} L 0 ${g} Z`} fill="#b9a35f" opacity={0.6} />
        {[0.12, 0.72].map((x, i) => {
          const s = Math.min(W, H) / 1080, hx = W * x;
          return (
            <g key={i} transform={`translate(${hx} ${g}) scale(${s})`}>
              <rect x={0} y={-190} width={230} height={190} fill="#e9c58f" /><path d="M -24 -190 L 115 -300 L 254 -190 Z" fill="#9b4a2c" />
              <rect x={90} y={-110} width={50} height={110} fill="#6b3e22" /><rect x={20} y={-150} width={44} height={40} fill="#ffd36e" />
            </g>
          );
        })}
        {[0.42, 0.95].map((x, i) => { const s = Math.min(W, H) / 1080; return <g key={i} transform={`translate(${W * x} ${g}) scale(${s})`}><rect x={-12} y={-180} width={24} height={180} fill="#7a4a2a" /><circle cx={0} cy={-210} r={80} fill="#4f9a55" /><circle cx={-50} cy={-170} r={50} fill="#5aa860" /><circle cx={50} cy={-170} r={50} fill="#468c4c" /></g>; })}
        <rect y={g} width={W} height={H - g} fill="#c9a66b" />
      </g>
    );
    case "palace": {
      const red = p0 ?? "#7a1f24", gold = p1 ?? "#e7b24a";
      const n = W > H ? 6 : 4, s = Math.min(W, H) / 1080;
      return (
        <g>
          <defs><Grad id={id("wall")} a={shade(red, -0.35)} b={red} /></defs>
          <rect width={W} height={H} fill={`url(#${id("wall")})`} />
          <rect y={0} width={W} height={H * 0.07} fill={gold} />
          {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M ${(i / 24) * W} ${H * 0.07} q ${W / 48} ${H * 0.035} ${W / 24} 0`} fill={gold} />)}
          {Array.from({ length: n }, (_, i) => {
            const x = ((i + 0.5) / n) * W, w = 46 * s;
            return (
              <g key={i}>
                <rect x={x - w / 2} y={H * 0.1} width={w} height={g - H * 0.1} fill={gold} />
                <rect x={x - w / 2 - 10 * s} y={H * 0.1} width={w + 20 * s} height={22 * s} fill={shade(gold, -0.2)} />
                <rect x={x - w / 2 - 10 * s} y={g - 22 * s} width={w + 20 * s} height={22 * s} fill={shade(gold, -0.2)} />
                <path d={`M ${x - 8 * s} ${H * 0.2} q ${8 * s} ${-26 * s} ${16 * s} 0 q -${8 * s} ${10 * s} -${16 * s} 0`} fill="#ffb02e" opacity={0.6 + 0.4 * Math.abs(Math.sin(t * 3 + i))} />
              </g>
            );
          })}
          <path d={`M ${W * 0.38} ${H} L ${W * 0.45} ${g} L ${W * 0.55} ${g} L ${W * 0.62} ${H} Z`} fill="#b3212c" />
          <rect y={g} width={W} height={H - g} fill={shade(red, -0.55)} opacity={0.6} />
        </g>
      );
    }
    case "temple": {
      const s = Math.min(W, H) / 1080, cx = W / 2;
      return (
        <g>
          <defs><Grad id={id("sky")} a={p0 ?? "#ff9e5e"} b={p1 ?? "#ffe0a3"} /></defs>
          <rect width={W} height={H} fill={`url(#${id("sky")})`} />
          <g transform={`translate(${cx} ${g}) scale(${s})`}>
            <path d="M -260 0 L -260 -260 L 260 -260 L 260 0 Z" fill="#e8c27a" />
            <path d="M -200 -260 Q -170 -560 0 -700 Q 170 -560 200 -260 Z" fill="#d9a65a" />
            {[-560, -480, -400, -320].map((y) => <path key={y} d={`M ${-150 - (y + 560) * 0.18} ${y} Q 0 ${y - 30} ${150 + (y + 560) * 0.18} ${y}`} stroke="#b5823d" strokeWidth={8} fill="none" />)}
            <path d="M -14 -700 L 0 -760 L 14 -700 Z" fill="#c0392b" /><line x1={0} y1={-760} x2={40} y2={-748} stroke="#c0392b" strokeWidth={4} />
            <path d="M -70 0 L -70 -150 Q 0 -210 70 -150 L 70 0 Z" fill="#6b3a1f" />
            <path d="M -240 -250 Q -120 -200 0 -250 Q 120 -200 240 -250" stroke="#f26b3a" strokeWidth={10} fill="none" />
          </g>
          <rect y={g} width={W} height={H - g} fill="#c99a5c" />
        </g>
      );
    }
    case "room": case "office": case "classroom": {
      const wall = p0 ?? (kind === "office" ? "#dfe7ee" : kind === "classroom" ? "#efe6cf" : "#f1d9b5"), floor = p1 ?? (kind === "office" ? "#9aa7b3" : "#b07a4f");
      const s = Math.min(W, H) / 1080;
      return (
        <g>
          <rect width={W} height={H} fill={wall} />
          <rect y={g - 30 * s} width={W} height={30 * s} fill={shade(wall, -0.18)} />
          <rect y={g} width={W} height={H - g} fill={floor} />
          {kind === "classroom" ? (
            <g><rect x={W * 0.18} y={H * 0.14} width={W * 0.64} height={H * 0.3} rx={10} fill="#2f5a46" stroke="#8a5a34" strokeWidth={14 * s} />
              <path d={`M ${W * 0.24} ${H * 0.22} h ${W * 0.2} M ${W * 0.24} ${H * 0.28} h ${W * 0.3}`} stroke="#e8efe8" strokeWidth={5 * s} opacity={0.7} /></g>
          ) : (
            <g>
              <rect x={W * 0.62} y={H * 0.16} width={W * 0.26} height={H * 0.26} fill={kind === "office" ? "#bfe3ff" : "#9fd3f5"} stroke="#fff" strokeWidth={12 * s} />
              {kind === "office" ? Array.from({ length: 6 }, (_, i) => <line key={i} x1={W * 0.62} x2={W * 0.88} y1={H * (0.18 + i * 0.04)} y2={H * (0.18 + i * 0.04)} stroke="#e6eef5" strokeWidth={6 * s} />)
                : <line x1={W * 0.75} y1={H * 0.16} x2={W * 0.75} y2={H * 0.42} stroke="#fff" strokeWidth={8 * s} />}
              <rect x={W * 0.12} y={H * 0.2} width={W * 0.16} height={H * 0.13} fill="#e7b24a" stroke="#8a5a34" strokeWidth={8 * s} />
              <circle cx={W * 0.2} cy={H * 0.265} r={H * 0.035} fill="#d6453a" opacity={0.7} />
            </g>
          )}
        </g>
      );
    }
    case "forest": return (
      <g>
        <defs><Grad id={id("sky")} a={p0 ?? "#2c5b4a"} b={p1 ?? "#9ccf8e"} /></defs>
        <rect width={W} height={H} fill={`url(#${id("sky")})`} />
        {[0, 1, 2].map((layer) => Array.from({ length: 8 + layer * 2 }, (_, i) => {
          const n = 8 + layer * 2, x = (i + rand(i + layer * 10) * 0.6) * (W / n), s = Math.min(W, H) / 1080 * (0.8 + layer * 0.35);
          const col = ["#3f7f5a", "#2f6a4a", "#1f553a"][layer];
          return <g key={`${layer}-${i}`} transform={`translate(${x} ${g + layer * 10}) scale(${s})`}><rect x={-10} y={-120} width={20} height={120} fill="#5b3a22" /><path d="M -80 -100 L 0 -330 L 80 -100 Z" fill={col} /><path d="M -64 -190 L 0 -380 L 64 -190 Z" fill={shade(col, 0.08)} /></g>;
        }))}
        <rect y={g} width={W} height={H - g} fill="#2a4a32" />
      </g>
    );
    case "mountains": return (
      <g>
        <defs><Grad id={id("sky")} a={p0 ?? "#8ec5ff"} b={p1 ?? "#e9f4ff"} /></defs>
        <rect width={W} height={H} fill={`url(#${id("sky")})`} />
        <path d={`M 0 ${g} L ${W * 0.2} ${g - H * 0.36} L ${W * 0.42} ${g} Z`} fill="#7d8fb3" />
        <path d={`M ${W * 0.25} ${g} L ${W * 0.55} ${g - H * 0.46} L ${W * 0.85} ${g} Z`} fill="#6a7ca3" />
        <path d={`M ${W * 0.55 - W * 0.06} ${g - H * 0.37} L ${W * 0.55} ${g - H * 0.46} L ${W * 0.55 + W * 0.06} ${g - H * 0.37} L ${W * 0.56} ${g - H * 0.39} L ${W * 0.53} ${g - H * 0.36} Z`} fill="#f4f8ff" />
        <path d={`M ${W * 0.6} ${g} L ${W * 0.85} ${g - H * 0.3} L ${W * 1.1} ${g} Z`} fill="#8597bb" />
        <rect y={g} width={W} height={H - g} fill="#7fb06f" />
      </g>
    );
    case "sea": return (
      <g>
        <defs><Grad id={id("sky")} a={p0 ?? "#ffb36b"} b={p1 ?? "#ffe2b8"} /></defs>
        <rect width={W} height={H} fill={`url(#${id("sky")})`} />
        <circle cx={W / 2} cy={H * 0.55} r={Math.min(W, H) * 0.1} fill="#fff1c9" />
        <rect y={H * 0.55} width={W} height={H * 0.45} fill="#2f7fb5" />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M ${((i * 160 + t * 30) % (W + 200)) - 100} ${H * (0.6 + (i % 4) * 0.06)} q 20 -10 40 0 q 20 10 40 0`} stroke="#9fd0f0" strokeWidth={4} fill="none" />)}
        <path d={`M 0 ${g} Q ${W / 2} ${g - H * 0.04} ${W} ${g} L ${W} ${H} L 0 ${H} Z`} fill="#e8cf98" />
      </g>
    );
    case "space": return (
      <g>
        <rect width={W} height={H} fill={p0 ?? "#070a1d"} />
        <Stars W={W} H={H} t={t} n={110} top={1} />
        <circle cx={W * 0.82} cy={H * 0.2} r={Math.min(W, H) * 0.09} fill="#e0815a" /><ellipse cx={W * 0.82} cy={H * 0.2} rx={Math.min(W, H) * 0.15} ry={Math.min(W, H) * 0.025} fill="none" stroke="#f3c38b" strokeWidth={6} />
        <circle cx={W * 0.15} cy={H * 0.32} r={Math.min(W, H) * 0.04} fill="#6ab0e8" />
      </g>
    );
    default: {
      const a = p0 ?? "#1d2547", b = p1 ?? "#3a2c5e";
      return (
        <g>
          <defs><Grad id={id("pl")} a={a} b={b} /></defs>
          <rect width={W} height={H} fill={`url(#${id("pl")})`} />
        </g>
      );
    }
  }
};
