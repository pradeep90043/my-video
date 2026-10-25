/**
 * Environments for the film shots, drawn in the fixed 1920x1080 space. Each is split in a back pass (wall, shelves, window) and a
 * front pass (the counter people stand behind), so a seller can stand "behind" the counter without any masking.
 */
import React from "react";
import type { EnvKind } from "./schema";

const W = 1920, H = 1080;
const rnd = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const SPINES = ["#4f6fa3", "#6fa58f", "#c8b46c", "#b46a6a", "#8a7ab0", "#d9dbdc", "#5b8c9b", "#c98f5a", "#7d8f6a", "#3f4d66"];

/** Shared gradients and filters: one <defs> per shot. */
export const FilmDefs: React.FC = () => (
  <defs>
    <linearGradient id="fl-sil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b1d22" /><stop offset="1" stopColor="#060607" /></linearGradient>
    <radialGradient id="fl-warm" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffe9b0" stopOpacity="0.55" /><stop offset="1" stopColor="#ffe9b0" stopOpacity="0" /></radialGradient>
    <radialGradient id="fl-cool" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#bcd6ff" stopOpacity="0.45" /><stop offset="1" stopColor="#bcd6ff" stopOpacity="0" /></radialGradient>
    <radialGradient id="fl-vig" cx="50%" cy="50%" r="72%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.55" /></radialGradient>
    <filter id="fl-soft"><feGaussianBlur stdDeviation="14" /></filter>
    <filter id="fl-soft2"><feGaussianBlur stdDeviation="5" /></filter>
    <filter id="fl-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" /><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 0" /></filter>
  </defs>
);

const Shelves: React.FC<{ x: number; y: number; cols: number; rows: number; cw: number; ch: number; seed: number }> = ({ x, y, cols, rows, cw, ch, seed }) => {
  const r = rnd(seed);
  const out: React.ReactNode[] = [];
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const cx = x + c * cw, cy = y + row * ch;
      out.push(<rect key={`c${row}-${c}`} x={cx + 4} y={cy + 4} width={cw - 8} height={ch - 8} fill="#d6dadd" />);
      // a row of upright books in each cubby
      let bx = cx + 10;
      const n = 3 + Math.floor(r() * 3);
      for (let b = 0; b < n && bx < cx + cw - 22; b++) {
        const bw = 14 + r() * 14, bh = ch * (0.5 + r() * 0.38);
        out.push(<rect key={`b${row}-${c}-${b}`} x={bx} y={cy + ch - 4 - bh} width={bw} height={bh} fill={SPINES[Math.floor(r() * SPINES.length)]} opacity={0.92} />);
        out.push(<rect key={`s${row}-${c}-${b}`} x={bx + 2} y={cy + ch - 4 - bh + 10} width={bw - 4} height={3} fill="#fff" opacity={0.5} />);
        bx += bw + 2;
      }
      if (r() > 0.55) out.push(<rect key={`f${row}-${c}`} x={cx + cw - 52} y={cy + ch - 62} width={38} height={54} fill={SPINES[Math.floor(r() * SPINES.length)]} opacity={0.9} transform={`rotate(${-6 + r() * 12} ${cx + cw - 33} ${cy + ch - 8})`} />);
    }
  }
  return <g>{out}<rect x={x} y={y} width={cols * cw} height={rows * ch} fill="none" stroke="#f3f4f5" strokeWidth={8} /></g>;
};

const Pendants: React.FC<{ xs: number[]; y: number }> = ({ xs, y }) => (
  <g>
    {xs.map((x) => (
      <g key={x}>
        <line x1={x} y1={0} x2={x} y2={y} stroke="#555a60" strokeWidth={3} />
        <path d={`M${x - 46},${y + 44} Q${x},${y - 20} ${x + 46},${y + 44} Z`} fill="#7c8288" />
        <ellipse cx={x} cy={y + 150} rx={170} ry={210} fill="url(#fl-warm)" opacity={0.5} />
      </g>
    ))}
  </g>
);

/** What is seen through a window: autumn street, softly out of focus. */
export const StreetArt: React.FC<{ x: number; y: number; w: number; h: number; t: number; night?: boolean }> = ({ x, y, w, h, t, night }) => {
  const r = rnd(7);
  const car = ((t * 3) % (w + 400)) - 200;
  return (
    <g>
      <clipPath id={`fl-win-${x}-${y}`}><rect x={x} y={y} width={w} height={h} /></clipPath>
      <g clipPath={`url(#fl-win-${x}-${y})`}>
        <rect x={x} y={y} width={w} height={h} fill={night ? "#16202f" : "#bcd8ee"} />
        {!night && <ellipse cx={x + w * 0.75} cy={y + h * 0.18} rx={90} ry={60} fill="#fff" opacity={0.7} />}
        {Array.from({ length: 9 }).map((_, i) => {
          const bw = 130 + r() * 90, bx = x + i * (w / 8.2) - 30, bh = h * (0.28 + r() * 0.3);
          return <g key={i}><rect x={bx} y={y + h * 0.78 - bh} width={bw} height={bh} fill={night ? "#243044" : "#a9a6a2"} /><rect x={bx + 14} y={y + h * 0.78 - bh + 18} width={bw - 28} height={bh * 0.5} fill={night ? "#f2d27a" : "#d7e3ea"} opacity={night ? 0.5 : 0.55} /></g>;
        })}
        <rect x={x} y={y + h * 0.76} width={w} height={h * 0.24} fill={night ? "#1d242e" : "#8d8f93"} />
        <rect x={x} y={y + h * 0.84} width={w} height={6} fill="#d9d5c9" opacity={0.7} />
        <g transform={`translate(${x + car},${y + h * 0.8})`}>
          <rect x={0} y={-30} width={150} height={36} rx={12} fill="#9a4b46" /><rect x={28} y={-56} width={86} height={32} rx={12} fill="#7e3e3a" />
          <circle cx={34} cy={8} r={13} fill="#222" /><circle cx={118} cy={8} r={13} fill="#222" />
        </g>
        {[0.12, 0.62, 0.9].map((p, i) => (
          <g key={i}><rect x={x + w * p - 7} y={y + h * 0.5} width={14} height={h * 0.3} fill="#5b4636" /><circle cx={x + w * p} cy={y + h * 0.46} r={70} fill={i % 2 ? "#d08a3c" : "#c25e2e"} opacity={0.85} /></g>
        ))}
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#e9ecee" strokeWidth={14} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#e9ecee" strokeWidth={10} />
    </g>
  );
};

const Counter: React.FC<{ drawers?: boolean }> = ({ drawers }) => (
  <g>
    <rect x={0} y={700} width={W} height={34} fill="#eceff1" />
    <rect x={0} y={700} width={W} height={6} fill="#fff" opacity={0.8} />
    <rect x={0} y={734} width={W} height={H - 734} fill="#d7dcdf" />
    {drawers
      ? Array.from({ length: 12 }).map((_, i) => <g key={i}><rect x={20 + i * 160} y={770} width={140} height={110} rx={6} fill="#bfc6cb" stroke="#9ea6ac" strokeWidth={3} /><rect x={70 + i * 160} y={800} width={40} height={10} rx={5} fill="#7b838a" /></g>)
      : Array.from({ length: 54 }).map((_, i) => <rect key={i} x={i * 36 + 8} y={742} width={5} height={H - 742} fill="#aeb5ba" opacity={0.55} />)}
    <rect x={0} y={734} width={W} height={26} fill="#000" opacity={0.18} />
  </g>
);

const Dust: React.FC<{ t: number }> = ({ t }) => (
  <g opacity={0.5}>{Array.from({ length: 26 }).map((_, i) => {
    const r = rnd(i + 1);
    const x = (r() * W + Math.sin((t + i * 30) / 90) * 40) % W, y = (r() * H - t * (0.2 + r() * 0.3) + H * 4) % H;
    return <circle key={i} cx={x} cy={y} r={1.5 + r() * 2.5} fill="#fff" opacity={0.25 + r() * 0.4} />;
  })}</g>
);

export const EnvBack: React.FC<{ kind: EnvKind; grade: string; t: number }> = ({ kind, grade, t }) => {
  const night = grade === "night" || grade === "rain";
  switch (kind) {
    case "black": return <rect width={W} height={H} fill="#000" />;
    case "paper": return <rect width={W} height={H} fill="#e9e6df" />;
    case "shop-counter":
    case "shop-floor":
      return (
        <g>
          <rect width={W} height={H} fill="#d9dee1" />
          <rect x={0} y={0} width={W} height={700} fill="#e3e7ea" />
          <Shelves x={500} y={70} cols={10} rows={4} cw={142} ch={150} seed={11} />
          <rect x={0} y={0} width={500} height={700} fill="#cfd5d9" />
          <rect x={90} y={140} width={150} height={190} fill="#f4f4f2" stroke="#8a9096" strokeWidth={8} /><rect x={110} y={170} width={110} height={90} fill="#8fb1c9" />
          <rect x={270} y={180} width={120} height={150} fill="#f4f4f2" stroke="#8a9096" strokeWidth={8} /><circle cx={330} cy={250} r={34} fill="#d49a6a" />
          <g transform="translate(120,460)"><rect width={230} height={190} rx={36} fill="#9aa2a8" /><rect x={20} y={120} width={190} height={70} rx={20} fill="#858d93" /></g>
          <Pendants xs={[760, 1160, 1540]} y={90} />
          <rect x={0} y={560} width={W} height={140} fill="#b9c0c4" opacity={0.0} />
          {kind === "shop-floor" && <g><rect x={0} y={700} width={W} height={380} fill="#c9ced1" /><rect x={600} y={880} width={720} height={150} rx={8} fill="#6b727a" opacity={0.7} /></g>}
        </g>
      );
    case "shop-window":
      return (
        <g>
          <rect width={W} height={H} fill="#dfe4e7" />
          <StreetArt x={240} y={110} w={1440} h={520} t={t} />
          <rect x={0} y={620} width={W} height={90} fill="#cdd3d7" />
          {[0, 1, 2].map((i) => <rect key={i} x={420 + i * 520} y={650} width={260} height={50} rx={4} fill="#f2f4f5" stroke="#b5bcc1" strokeWidth={3} />)}
        </g>
      );
    case "home-wall":
      return (
        <g>
          <rect width={W} height={H} fill={night ? "#2b3139" : "#a9afb4"} />
          <rect x={0} y={0} width={W} height={620} fill={night ? "#343b44" : "#b7bcc1"} />
          <rect x={430} y={90} width={460} height={690} rx={6} fill={night ? "#cfd3d6" : "#eef0f1"} /><rect x={430} y={90} width={460} height={690} rx={6} fill="none" stroke="#9aa0a5" strokeWidth={6} />
          {[0, 1, 2].map((i) => <circle key={i} cx={470 + i * 190} cy={110} r={10} fill={["#6aa58a", "#c8b46c", "#8a7ab0"][i]} />)}
          <g transform="translate(1180,150)">
            <rect width={470} height={420} fill={night ? "#0f1626" : "#c4dcee"} />
            {night && <><circle cx={380} cy={90} r={34} fill="#f3efd8" /><circle cx={380} cy={90} r={70} fill="url(#fl-cool)" /></>}
            {night && Array.from({ length: 22 }).map((_, i) => <rect key={i} x={30 + (i * 53) % 420} y={290 + ((i * 37) % 110)} width={14} height={18} fill="#f2d27a" opacity={0.6} />)}
            <path d="M0,300 L90,260 L180,300 L260,250 L360,300 L470,270 L470,420 L0,420 Z" fill={night ? "#101a2c" : "#9bb5a4"} opacity={0.8} />
            <rect width={470} height={420} fill="none" stroke="#e8ebed" strokeWidth={16} /><line x1={235} y1={0} x2={235} y2={420} stroke="#e8ebed" strokeWidth={10} />
          </g>
          <rect x={1100} y={590} width={650} height={26} fill="#dfe3e6" />
          <rect x={0} y={640} width={W} height={H - 640} fill={night ? "#3a424b" : "#8f969c"} />
          <rect x={0} y={640} width={W} height={10} fill="#fff" opacity={0.25} />
          <g transform="translate(1290,520)"><rect width={120} height={80} rx={6} fill="#2d333b" /><rect x={8} y={8} width={104} height={58} fill={night ? "#8fb1c9" : "#a9c3d6"} /></g>
          <g transform="translate(1500,545)"><rect width={64} height={50} rx={6} fill="#e7e2d6" /><path d="M64,12 Q90,16 64,38" fill="none" stroke="#e7e2d6" strokeWidth={8} /></g>
          <Dust t={t} />
        </g>
      );
    case "home-door":
      return (
        <g>
          <rect width={W} height={H} fill="#7f868c" />
          <rect x={0} y={0} width={W} height={780} fill="#aeb4b9" />
          <rect x={560} y={70} width={800} height={760} fill="#3d4349" /><rect x={600} y={110} width={720} height={680} fill="#2a2f34" />
          <g><clipPath id="fl-doorglass"><rect x={640} y={150} width={640} height={420} /></clipPath>
            <g clipPath="url(#fl-doorglass)"><StreetArt x={640} y={150} w={640} h={420} t={t} /></g></g>
          <rect x={0} y={780} width={W} height={H - 780} fill="#3a2f2a" />
          <rect x={0} y={780} width={W} height={18} fill="#000" opacity={0.3} />
          <rect x={620} y={870} width={680} height={130} rx={10} fill="#27313c" stroke="#3d4b5a" strokeWidth={8} />
          {Array.from({ length: 12 }).map((_, i) => { const r = rnd(i + 40); return <ellipse key={i} cx={200 + r() * 1500} cy={850 + r() * 200} rx={16} ry={8} fill={["#c25e2e", "#d08a3c", "#a8482a"][i % 3]} opacity={0.8} transform={`rotate(${r() * 90} 200 900)`} />; })}
        </g>
      );
    case "dark-table":
      return (
        <g>
          <rect width={W} height={H} fill="#2c3238" />
          <rect width={W} height={H} fill="url(#fl-cool)" opacity={0.18} />
          {Array.from({ length: 14 }).map((_, i) => <line key={i} x1={0} y1={60 + i * 80} x2={W} y2={30 + i * 84} stroke="#fff" strokeOpacity={0.025} strokeWidth={5} />)}
          <circle cx={1530} cy={170} r={120} fill="none" stroke="#fff" strokeOpacity={0.05} strokeWidth={10} />
          <circle cx={1530} cy={170} r={150} fill="url(#fl-cool)" opacity={0.2} />
        </g>
      );
    case "desk-night":
    case "desk-dawn": {
      const dawn = kind === "desk-dawn";
      return (
        <g>
          <rect width={W} height={H} fill={dawn ? "#38404a" : "#141a24"} />
          <g transform="translate(180,120)">
            <rect width={560} height={500} fill={dawn ? "#e9b27a" : "#0d1320"} />
            {dawn && <><rect y={280} width={560} height={220} fill="#c98a5a" opacity={0.6} /><circle cx={300} cy={300} r={90} fill="#ffd9a0" opacity={0.9} /></>}
            {!dawn && Array.from({ length: 26 }).map((_, i) => <circle key={i} cx={20 + (i * 71) % 520} cy={300 + ((i * 53) % 180)} r={4 + (i % 4)} fill="#f2d27a" opacity={0.35 + (i % 3) * 0.15} filter="url(#fl-soft2)" />)}
            <rect width={560} height={500} fill="none" stroke="#2b3441" strokeWidth={18} /><line x1={280} y1={0} x2={280} y2={500} stroke="#2b3441" strokeWidth={12} />
          </g>
          <rect x={0} y={700} width={W} height={H - 700} fill={dawn ? "#4a4540" : "#232932"} />
          <rect x={0} y={700} width={W} height={8} fill="#fff" opacity={0.12} />
          {!dawn && (
            <g>
              <ellipse cx={1200} cy={760} rx={620} ry={150} fill="url(#fl-warm)" opacity={0.9 - 0.06 * Math.sin(t / 7)} />
              <g transform="translate(1450,300)"><line x1={0} y1={400} x2={0} y2={150} stroke="#545b63" strokeWidth={10} /><line x1={0} y1={150} x2={-110} y2={60} stroke="#545b63" strokeWidth={10} /><path d="M-170,100 L-60,60 L-70,10 Z" fill="#6a727a" /><ellipse cx={-110} cy={72} rx={40} ry={10} fill="#fff4c9" /></g>
            </g>
          )}
          <g transform="translate(1630,640)"><rect width={70} height={64} rx={8} fill="#e7e2d6" /><path d="M70,14 Q98,18 70,44" fill="none" stroke="#e7e2d6" strokeWidth={8} /></g>
          <Dust t={t} />
        </g>
      );
    }
    case "street-view":
      return <StreetArt x={0} y={0} w={W} h={H} t={t} night={night} />;
    case "hill-day":
      return (
        <g>
          <rect width={W} height={H} fill="#bcdcf0" />
          <circle cx={1500} cy={170} r={80} fill="#fff6d6" /><circle cx={1500} cy={170} r={260} fill="url(#fl-warm)" />
          <path d="M0,560 Q300,470 620,540 T1300,520 T1920,540 L1920,1080 L0,1080 Z" fill="#a8c7a0" />
          <path d="M0,640 Q420,560 900,630 T1920,610 L1920,1080 L0,1080 Z" fill="#8fbd86" />
          <path d="M0,760 Q500,690 1000,750 T1920,730 L1920,1080 L0,1080 Z" fill="#76ac6e" />
          <g transform="translate(1000,0)"><rect x={-260} y={915} width={520} height={26} rx={6} fill="#8a5a3a" /><rect x={-240} y={941} width={22} height={90} fill="#6b4328" /><rect x={218} y={941} width={22} height={90} fill="#6b4328" /><ellipse cx={0} cy={1040} rx={320} ry={26} fill="#000" opacity={0.18} /></g>
          <g transform="translate(240,340)"><rect x={-14} y={150} width={28} height={250} fill="#6b4a36" /><circle cx={0} cy={110} r={150} fill="#5f9b55" /><circle cx={-90} cy={170} r={90} fill="#6aaa5f" /></g>
          {Array.from({ length: 70 }).map((_, i) => { const r = rnd(i + 5); const x = r() * W, y = 780 + r() * 300; return <path key={i} d={`M${x},${y} q${Math.sin((t + i * 11) / 30) * 8},-24 ${Math.sin((t + i * 11) / 30) * 14},-${30 + r() * 24}`} stroke="#4f8a49" strokeWidth={5} fill="none" strokeLinecap="round" />; })}
        </g>
      );
    default: return null;
  }
};

export const EnvFront: React.FC<{ kind: EnvKind }> = ({ kind }) => {
  if (kind === "shop-counter" || kind === "shop-floor") return <Counter />;
  if (kind === "shop-window") return <Counter drawers />;
  return null;
};
