import React from "react";

/**
 * Flat icons for things: held in a hand, shown big in the middle of a shot, or used inside a graphic. Each one is drawn in a
 * box from -50 to 50 and scaled to `size`.
 */

/** Where a held thing sits relative to the hand (in units of its size) and how it is turned. */
export const PROP_GRIP: Record<string, { size: number; dx: number; dy: number; rot: number }> = {
  default: { size: 90, dx: 0, dy: -0.45, rot: 0 },
  sword: { size: 230, dx: 0, dy: -0.42, rot: 0 }, trident: { size: 300, dx: 0, dy: -0.3, rot: 0 }, mace: { size: 200, dx: 0, dy: -0.35, rot: 0 },
  bow: { size: 240, dx: 0.05, dy: 0, rot: 0 }, flag: { size: 230, dx: 0.1, dy: -0.4, rot: 0 }, torch: { size: 150, dx: 0, dy: -0.35, rot: 0 },
  umbrella: { size: 260, dx: 0, dy: -0.4, rot: 0 }, cane: { size: 240, dx: 0, dy: 0.3, rot: 0 }, flute: { size: 170, dx: 0.1, dy: -0.1, rot: -60 },
  diya: { size: 90, dx: 0, dy: -0.35, rot: 0 }, phone: { size: 80, dx: 0, dy: -0.4, rot: 0 }, book: { size: 100, dx: 0, dy: -0.3, rot: 0 },
  laptop: { size: 130, dx: 0, dy: -0.3, rot: 0 }, mic: { size: 90, dx: 0, dy: -0.4, rot: 0 }, pen: { size: 80, dx: 0, dy: -0.35, rot: 20 },
};

const C = { gold: "#f2b53a", goldD: "#c98a1b", red: "#d6453a", ink: "#2a2230", white: "#f7f3ea", steel: "#c9d1d9", steelD: "#8b97a3", wood: "#8a5a34", green: "#3fa66b", blue: "#3b7dd8", flame: "#ffb02e", flameIn: "#fff1b0" };

export const PropIcon: React.FC<{ name: string; size: number; silhouette?: boolean }> = ({ name, size, silhouette }) => (
  <g transform={`scale(${size / 100})`} style={silhouette ? { filter: "brightness(0)" } : undefined}>{draw(name)}</g>
);

function flame(x: number, y: number, k = 1) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d="M 0 -30 Q 16 -8 10 6 Q 4 16 0 16 Q -4 16 -10 6 Q -16 -8 0 -30 Z" fill={C.flame} />
      <path d="M 0 -14 Q 7 0 4 8 Q 0 12 -4 8 Q -7 0 0 -14 Z" fill={C.flameIn} />
    </g>
  );
}

function draw(name: string): React.ReactNode {
  switch (name) {
    case "phone": return <g><rect x={-24} y={-46} width={48} height={92} rx={9} fill={C.ink} /><rect x={-19} y={-38} width={38} height={72} rx={4} fill={C.blue} /><circle cx={0} cy={40} r={3} fill="#666" /></g>;
    case "book": return <g><rect x={-42} y={-32} width={84} height={64} rx={5} fill={C.red} /><rect x={-36} y={-26} width={72} height={52} fill={C.white} /><line x1={0} y1={-26} x2={0} y2={26} stroke="#bbb" strokeWidth={3} /><rect x={-42} y={-32} width={84} height={10} fill="#a3322a" /></g>;
    case "diya": return <g><path d="M -44 0 Q 0 46 44 0 Q 30 -6 0 -6 Q -30 -6 -44 0 Z" fill="#c8652a" /><path d="M -44 0 Q 0 10 44 0" stroke="#8f4317" strokeWidth={4} fill="none" />{flame(0, -16, 1.1)}<circle cx={0} cy={-18} r={40} fill={C.flame} opacity={0.18} /></g>;
    case "sword": return <g><path d="M -6 22 L -6 -36 L 0 -50 L 6 -36 L 6 22 Z" fill={C.steel} /><line x1={0} y1={-36} x2={0} y2={20} stroke={C.steelD} strokeWidth={2} /><rect x={-18} y={22} width={36} height={8} rx={3} fill={C.gold} /><rect x={-4} y={30} width={8} height={20} fill={C.wood} /></g>;
    case "bow": return <g><path d="M -6 -48 Q 34 0 -6 48" stroke={C.wood} strokeWidth={7} fill="none" /><line x1={-6} y1={-48} x2={-6} y2={48} stroke="#eee" strokeWidth={2} /></g>;
    case "flower": return <g><line x1={0} y1={0} x2={0} y2={46} stroke={C.green} strokeWidth={5} />{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-18} rx={10} ry={18} fill="#ef7aa1" transform={`rotate(${a})`} />)}<circle cx={0} cy={0} r={10} fill={C.gold} /></g>;
    case "cup": return <g><path d="M -26 -24 L 26 -24 L 20 30 L -20 30 Z" fill={C.white} /><path d="M 26 -12 Q 42 -10 40 6 Q 38 18 22 16" stroke={C.white} strokeWidth={7} fill="none" /><path d="M -10 -32 Q -4 -40 -10 -48 M 6 -32 Q 12 -40 6 -48" stroke="#ccc" strokeWidth={3} fill="none" /></g>;
    case "gift": return <g><rect x={-38} y={-20} width={76} height={56} fill={C.red} /><rect x={-42} y={-34} width={84} height={18} fill="#e5574b" /><rect x={-6} y={-34} width={12} height={70} fill={C.gold} /><path d="M 0 -34 Q -26 -56 -24 -36 Z M 0 -34 Q 26 -56 24 -36 Z" fill={C.gold} /></g>;
    case "laptop": return <g><rect x={-40} y={-34} width={80} height={52} rx={4} fill={C.ink} /><rect x={-34} y={-28} width={68} height={40} fill={C.blue} /><path d="M -50 20 L 50 20 L 44 30 L -44 30 Z" fill={C.steelD} /></g>;
    case "bag": return <g><path d="M -20 -20 Q -20 -44 0 -44 Q 20 -44 20 -20" stroke={C.wood} strokeWidth={6} fill="none" /><rect x={-36} y={-22} width={72} height={60} rx={10} fill="#a8683c" /></g>;
    case "mic": return <g><rect x={-5} y={0} width={10} height={46} fill={C.ink} /><rect x={-16} y={-44} width={32} height={48} rx={16} fill={C.steelD} /><path d="M -12 -30 h 24 M -12 -18 h 24" stroke={C.ink} strokeWidth={2} /></g>;
    case "letter": return <g><rect x={-40} y={-28} width={80} height={56} rx={4} fill={C.white} /><path d="M -40 -28 L 0 6 L 40 -28" stroke="#c9b9a0" strokeWidth={4} fill="none" /><circle cx={0} cy={6} r={7} fill={C.red} /></g>;
    case "flag": return <g><rect x={-3} y={-50} width={6} height={100} fill={C.wood} /><path d="M 3 -48 L 44 -36 L 3 -20 Z" fill="#ff8a1f" /></g>;
    case "trident": return <g><rect x={-3} y={-30} width={6} height={80} fill={C.steelD} /><path d="M -22 -50 L -22 -26 Q 0 -10 22 -26 L 22 -50 L 14 -36 Q 0 -28 -14 -36 Z" fill={C.steel} /><path d="M -4 -30 L 0 -50 L 4 -30 Z" fill={C.steel} /><rect x={-8} y={-10} width={16} height={8} fill={C.gold} /></g>;
    case "mace": return <g><rect x={-4} y={-10} width={8} height={60} fill={C.goldD} /><circle cx={0} cy={-28} r={22} fill={C.gold} /><circle cx={0} cy={-50} r={5} fill={C.gold} /><path d="M -22 -28 h 44" stroke={C.goldD} strokeWidth={3} /></g>;
    case "flute": return <g><rect x={-4} y={-50} width={8} height={100} rx={4} fill="#c79a52" />{[-30, -14, 2, 18].map((y) => <circle key={y} cx={0} cy={y} r={2.5} fill="#5b3b1b" />)}<rect x={-5} y={-48} width={10} height={8} fill={C.red} /></g>;
    case "conch": return <g><path d="M -30 10 Q -40 -30 0 -40 Q 40 -36 34 0 Q 30 30 -6 34 Q -26 30 -30 10 Z" fill={C.white} /><path d="M -14 -20 Q 10 -26 18 0 Q 10 20 -10 18" stroke="#d8cdbb" strokeWidth={4} fill="none" /></g>;
    case "kalash": return <g><path d="M -30 -10 Q -40 30 0 40 Q 40 30 30 -10 Z" fill={C.gold} /><rect x={-20} y={-20} width={40} height={12} fill={C.goldD} /><path d="M -30 -24 Q -10 -40 0 -26 Q 10 -40 30 -24" stroke={C.green} strokeWidth={8} fill="none" /><circle cx={0} cy={-34} r={12} fill="#9a6a3a" /><path d="M -26 10 h 52" stroke={C.red} strokeWidth={5} /></g>;
    case "money": return <g><rect x={-46} y={-26} width={92} height={52} rx={6} fill="#4caf72" /><circle cx={0} cy={0} r={16} fill="#2e8a54" /><text x={0} y={7} textAnchor="middle" fontSize={22} fontWeight={900} fill="#d9f2e2">₹</text></g>;
    case "torch": return <g><path d="M -8 -10 L 8 -10 L 4 50 L -4 50 Z" fill={C.wood} /><rect x={-12} y={-18} width={24} height={10} fill={C.steelD} />{flame(0, -30, 1.3)}</g>;
    case "umbrella": return <g><path d="M -48 -10 Q 0 -60 48 -10 Z" fill={C.blue} /><line x1={0} y1={-34} x2={0} y2={40} stroke={C.ink} strokeWidth={4} /><path d="M 0 40 Q 0 50 -10 48" stroke={C.ink} strokeWidth={4} fill="none" /></g>;
    case "cane": return <g><path d="M 0 50 L 0 -36 Q 0 -50 14 -48 Q 24 -46 22 -36" stroke={C.wood} strokeWidth={7} fill="none" strokeLinecap="round" /></g>;
    case "pen": return <g><rect x={-5} y={-44} width={10} height={76} rx={3} fill={C.blue} /><path d="M -5 32 L 0 46 L 5 32 Z" fill={C.ink} /></g>;
    case "coin": return <g><circle r={36} fill={C.gold} /><circle r={27} fill="none" stroke={C.goldD} strokeWidth={5} /><text x={0} y={11} textAnchor="middle" fontSize={32} fontWeight={900} fill={C.goldD}>₹</text></g>;
    case "crown": return <g><path d="M -40 20 L -44 -24 L -20 -4 L 0 -34 L 20 -4 L 44 -24 L 40 20 Z" fill={C.gold} /><rect x={-40} y={14} width={80} height={12} fill={C.goldD} /><circle cx={0} cy={4} r={6} fill={C.red} /></g>;
    case "heart": return <path d="M 0 36 Q -46 6 -40 -18 Q -32 -42 0 -22 Q 32 -42 40 -18 Q 46 6 0 36 Z" fill="#ff4d6d" />;
    case "key": return <g><circle cx={-22} cy={0} r={18} fill="none" stroke={C.gold} strokeWidth={9} /><rect x={-4} y={-4} width={50} height={9} fill={C.gold} /><rect x={30} y={4} width={7} height={14} fill={C.gold} /><rect x={40} y={4} width={7} height={10} fill={C.gold} /></g>;
    case "bulb": return <g><circle cx={0} cy={-10} r={30} fill="#ffd54a" /><rect x={-14} y={18} width={28} height={20} rx={4} fill={C.steelD} /><path d="M -8 -10 l 8 12 l 8 -12" stroke="#c98a1b" strokeWidth={4} fill="none" /><circle cx={0} cy={-10} r={46} fill="#ffd54a" opacity={0.15} /></g>;
    case "clock": return <g><circle r={42} fill={C.white} stroke={C.ink} strokeWidth={6} /><line x1={0} y1={0} x2={0} y2={-28} stroke={C.ink} strokeWidth={6} strokeLinecap="round" /><line x1={0} y1={0} x2={20} y2={8} stroke={C.red} strokeWidth={5} strokeLinecap="round" /></g>;
    case "globe": return <g><circle r={42} fill={C.blue} /><path d="M -30 -18 Q -10 -30 4 -20 Q 10 0 -6 6 Q -24 4 -30 -18 Z M 10 10 Q 30 4 34 20 Q 20 36 8 26 Z" fill={C.green} /><ellipse rx={42} ry={14} fill="none" stroke="#9cc3f0" strokeWidth={2} /></g>;
    case "rocket": return <g><path d="M 0 -48 Q 22 -24 18 20 L -18 20 Q -22 -24 0 -48 Z" fill={C.white} /><circle cx={0} cy={-14} r={9} fill={C.blue} /><path d="M -18 6 L -32 30 L -16 22 Z M 18 6 L 32 30 L 16 22 Z" fill={C.red} />{flame(0, 34, 0.9)}</g>;
    case "chart": return <g><rect x={-44} y={-40} width={88} height={80} rx={6} fill={C.white} />{[[-30, 20], [-12, 0], [6, -14], [24, -28]].map(([x, h]) => <rect key={x} x={x} y={h} width={12} height={30 - h} fill={x > 0 ? C.green : C.blue} />)}</g>;
    case "lock": return <g><path d="M -22 -6 L -22 -24 Q -22 -46 0 -46 Q 22 -46 22 -24 L 22 -6" stroke={C.steelD} strokeWidth={9} fill="none" /><rect x={-32} y={-8} width={64} height={52} rx={8} fill={C.gold} /><circle cx={0} cy={14} r={7} fill={C.ink} /></g>;
    case "star": return <path d="M 0 -46 L 13 -14 L 46 -12 L 20 10 L 28 44 L 0 26 L -28 44 L -20 10 L -46 -12 L -13 -14 Z" fill={C.gold} />;
    case "fire": return <g>{flame(0, 6, 2.6)}</g>;
    case "water": return <path d="M 0 -46 Q 34 0 30 16 Q 26 40 0 40 Q -26 40 -30 16 Q -34 0 0 -46 Z" fill="#4aa8ff" />;
    case "leaf": return <g><path d="M -36 36 Q -40 -30 40 -40 Q 36 30 -36 36 Z" fill={C.green} /><path d="M -36 36 L 30 -30" stroke="#2c7a4d" strokeWidth={4} /></g>;
    case "skull": return <g><path d="M -34 -6 Q -36 -46 0 -46 Q 36 -46 34 -6 Q 32 14 20 18 L 20 34 L -20 34 L -20 18 Q -32 14 -34 -6 Z" fill={C.white} /><circle cx={-14} cy={-10} r={10} fill={C.ink} /><circle cx={14} cy={-10} r={10} fill={C.ink} /><path d="M -4 8 L 0 2 L 4 8 Z" fill={C.ink} /></g>;
    case "check": return <g><circle r={44} fill={C.green} /><path d="M -20 0 L -6 16 L 22 -14" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
    case "cross": return <g><circle r={44} fill={C.red} /><path d="M -16 -16 L 16 16 M 16 -16 L -16 16" stroke="#fff" strokeWidth={10} strokeLinecap="round" /></g>;
    case "question": return <g><circle r={44} fill={C.blue} /><text x={0} y={20} textAnchor="middle" fontSize={60} fontWeight={900} fill="#fff">?</text></g>;
    default: return <circle r={30} fill={C.gold} />;
  }
}
