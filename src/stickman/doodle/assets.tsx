import React from "react";
import type { SceneAsset, SceneTint } from "./catalog";

/**
 * Hand-drawn vector assets for the "scene" panel. Every asset is drawn in a 200 x 200 box (centre 100,100) with the
 * same look: thick near-black outline, round joins, flat colours. The key part of an asset takes the scene's tint.
 * `ASSET_DRAW` is a Record over every catalogue name, so a missing drawing is a compile error.
 */

export const INK = "#1B1B1B";
const SW = 6;

const TINTS: Record<SceneTint, { main: string; light: string }> = {
  red: { main: "#EB2D2D", light: "#FAD0D0" },
  blue: { main: "#1E82FA", light: "#CFE5FF" },
  green: { main: "#1FB36B", light: "#CDF1DF" },
  gold: { main: "#F5B419", light: "#FDEBB5" },
  gray: { main: "#8F9399", light: "#E4E6E9" },
};
const C = { white: "#FFFFFF", skin: "#F4CFA8", water: "#7CC4F2", brown: "#9A6A3A", leaf: "#3F9B5B", steel: "#B8BEC6", dark: "#4A4F57", pink: "#F6B8C4" };

type P = { main: string; light: string };
const ln = { stroke: INK, strokeWidth: SW, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** polygon points of a gear with `teeth` teeth */
const gearPath = (cx: number, cy: number, r0: number, r1: number, teeth: number): string => {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, r] of [[-0.28, r0], [-0.16, r1], [0.16, r1], [0.28, r0]] as [number, number][]) {
      pts.push(`${(cx + Math.cos(a + da * step * 2) * r).toFixed(1)},${(cy + Math.sin(a + da * step * 2) * r).toFixed(1)}`);
    }
  }
  return `M${pts.join(" L")} Z`;
};

const Person: React.FC<{ mood: "neutral" | "worried" | "happy"; t: P }> = ({ mood, t }) => (
  <g {...ln} fill="none">
    <line x1={100} y1={78} x2={100} y2={135} />
    {mood === "happy" ? (
      <>
        <path d="M100,92 L65,62" />
        <path d="M100,92 L135,62" />
      </>
    ) : mood === "worried" ? (
      <>
        <path d="M100,95 L72,110 L80,80" />
        <path d="M100,95 L128,110 L120,80" />
      </>
    ) : (
      <>
        <path d="M100,95 L68,120" />
        <path d="M100,95 L132,120" />
      </>
    )}
    <path d="M100,135 L74,185" />
    <path d="M100,135 L126,185" />
    <rect x={88} y={100} width={24} height={34} rx={6} fill={t.main} />
    <circle cx={100} cy={52} r={28} fill={C.skin} />
    <circle cx={90} cy={50} r={3.5} fill={INK} stroke="none" />
    <circle cx={110} cy={50} r={3.5} fill={INK} stroke="none" />
    {mood === "happy" && <path d="M88,62 Q100,76 112,62" strokeWidth={5} />}
    {mood === "neutral" && <path d="M90,64 H110" strokeWidth={5} />}
    {mood === "worried" && (
      <>
        <path d="M89,68 Q100,58 111,68" strokeWidth={5} />
        <path d="M84,40 L96,44 M116,40 L104,44" strokeWidth={4} />
        <path d="M128,30 C128,30 118,44 128,48 C138,44 128,30 128,30 Z" fill={C.water} strokeWidth={3} />
      </>
    )}
  </g>
);

export const ASSET_DRAW: Record<SceneAsset, (t: P) => React.ReactNode> = {
  server: (t) => (
    <g {...ln}>
      <rect x={48} y={14} width={104} height={172} rx={12} fill={C.steel} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0,${28 + i * 52})`}>
          <rect x={60} y={0} width={80} height={38} rx={6} fill={C.white} />
          <circle cx={76} cy={19} r={6} fill={t.main} />
          <line x1={92} y1={19} x2={128} y2={19} />
        </g>
      ))}
    </g>
  ),
  laptop: (t) => (
    <g {...ln}>
      <rect x={34} y={36} width={132} height={92} rx={9} fill={C.dark} />
      <rect x={44} y={46} width={112} height={72} rx={4} fill={C.white} />
      <rect x={54} y={58} width={48} height={8} rx={3} fill={t.main} stroke="none" />
      <line x1={54} y1={80} x2={140} y2={80} strokeWidth={4} />
      <line x1={54} y1={96} x2={118} y2={96} strokeWidth={4} />
      <path d="M12,140 H188 L172,166 H28 Z" fill={C.steel} />
    </g>
  ),
  phone: (t) => (
    <g {...ln}>
      <rect x={62} y={12} width={76} height={176} rx={16} fill={C.dark} />
      <rect x={70} y={30} width={60} height={132} rx={4} fill={C.white} />
      <rect x={76} y={40} width={48} height={30} rx={4} fill={t.main} stroke="none" />
      <line x1={76} y1={88} x2={124} y2={88} strokeWidth={4} />
      <line x1={76} y1={104} x2={110} y2={104} strokeWidth={4} />
      <circle cx={100} cy={176} r={5} fill={C.white} strokeWidth={3} />
    </g>
  ),
  cloud: (t) => (
    <g {...ln}>
      <path d="M52,140 C14,140 12,96 46,92 C42,56 90,38 110,66 C132,38 182,56 170,98 C204,100 200,140 160,140 Z" fill={t.light} />
      <path d="M70,118 Q90,106 110,118" strokeWidth={4} fill="none" />
    </g>
  ),
  database: (t) => (
    <g {...ln}>
      <path d="M38,48 V152 C38,178 162,178 162,152 V48" fill={t.main} />
      <ellipse cx={100} cy={48} rx={62} ry={24} fill={t.light} />
      <path d="M38,84 C38,110 162,110 162,84" fill="none" />
      <path d="M38,118 C38,144 162,144 162,118" fill="none" />
    </g>
  ),
  chip: (t) => (
    <g {...ln}>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line x1={72 + i * 19} y1={34} x2={72 + i * 19} y2={52} />
          <line x1={72 + i * 19} y1={148} x2={72 + i * 19} y2={166} />
          <line x1={34} y1={72 + i * 19} x2={52} y2={72 + i * 19} />
          <line x1={148} y1={72 + i * 19} x2={166} y2={72 + i * 19} />
        </g>
      ))}
      <rect x={50} y={50} width={100} height={100} rx={12} fill={C.dark} />
      <rect x={72} y={72} width={56} height={56} rx={6} fill={t.main} />
    </g>
  ),
  robot: (t) => (
    <g {...ln}>
      <line x1={100} y1={58} x2={100} y2={30} />
      <circle cx={100} cy={26} r={9} fill={t.main} />
      <rect x={30} y={88} width={14} height={36} rx={5} fill={C.steel} />
      <rect x={156} y={88} width={14} height={36} rx={5} fill={C.steel} />
      <rect x={44} y={58} width={112} height={100} rx={24} fill={C.steel} />
      <circle cx={76} cy={96} r={16} fill={C.white} />
      <circle cx={124} cy={96} r={16} fill={C.white} />
      <circle cx={78} cy={98} r={6} fill={INK} stroke="none" />
      <circle cx={126} cy={98} r={6} fill={INK} stroke="none" />
      <rect x={72} y={128} width={56} height={16} rx={8} fill={C.white} />
      <path d="M86,128 V144 M100,128 V144 M114,128 V144" strokeWidth={3} />
    </g>
  ),
  wifi: (t) => (
    <g {...ln} fill="none">
      <path d="M22,92 Q100,18 178,92" stroke={t.main} />
      <path d="M44,116 Q100,64 156,116" stroke={t.main} />
      <path d="M68,140 Q100,112 132,140" stroke={t.main} />
      <circle cx={100} cy={162} r={10} fill={INK} />
    </g>
  ),
  plug: (t) => (
    <g {...ln}>
      <path d="M100,178 V150" />
      <rect x={58} y={92} width={84} height={64} rx={16} fill={t.main} />
      <line x1={80} y1={92} x2={80} y2={50} />
      <line x1={120} y1={92} x2={120} y2={50} />
      <path d="M100,178 C100,196 60,196 40,184" fill="none" />
    </g>
  ),
  bolt: (t) => (
    <g {...ln}>
      <path d="M118,8 L48,112 H92 L76,192 L156,76 H110 Z" fill={t.main === "#8F9399" ? "#F5B419" : t.main} />
    </g>
  ),
  battery: (t) => (
    <g {...ln}>
      <rect x={22} y={56} width={146} height={90} rx={14} fill={C.white} />
      <rect x={168} y={84} width={16} height={34} rx={5} fill={C.steel} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={34 + i * 44} y={68} width={36} height={66} rx={6} fill={t.main} />
      ))}
    </g>
  ),
  lock: (t) => (
    <g {...ln}>
      <path d="M66,94 V66 C66,22 134,22 134,66 V94" fill="none" strokeWidth={9} />
      <rect x={42} y={90} width={116} height={92} rx={14} fill={t.main} />
      <circle cx={100} cy={128} r={11} fill={C.white} />
      <line x1={100} y1={136} x2={100} y2={158} strokeWidth={8} />
    </g>
  ),
  shield: (t) => (
    <g {...ln}>
      <path d="M100,12 L166,38 V100 C166,146 130,172 100,190 C70,172 34,146 34,100 V38 Z" fill={t.main} />
      <path d="M68,100 L92,126 L134,76" fill="none" stroke={C.white} strokeWidth={12} />
    </g>
  ),
  chart: (t) => (
    <g {...ln}>
      <path d="M28,20 V176 H184" fill="none" />
      {[56, 86, 116, 150].map((h, i) => (
        <rect key={i} x={46 + i * 34} y={176 - h * 0.9} width={24} height={h * 0.9} rx={3} fill={i === 3 ? t.main : t.light} />
      ))}
      <path d="M44,120 L84,92 L112,104 L168,40" fill="none" stroke={C.dark} strokeWidth={5} />
      <path d="M150,38 H170 V58" fill="none" stroke={C.dark} strokeWidth={5} />
    </g>
  ),
  document: (t) => (
    <g {...ln}>
      <path d="M50,14 H120 L156,50 V186 H50 Z" fill={C.white} />
      <path d="M120,14 V50 H156" fill={t.light} />
      {[84, 106, 128, 150].map((y, i) => (
        <line key={i} x1={68} y1={y} x2={i === 3 ? 108 : 138} y2={y} strokeWidth={4} />
      ))}
      <rect x={68} y={60} width={34} height={10} rx={3} fill={t.main} stroke="none" />
    </g>
  ),
  magnifier: (t) => (
    <g {...ln}>
      <line x1={126} y1={126} x2={176} y2={176} strokeWidth={16} />
      <circle cx={84} cy={84} r={58} fill={t.light} />
      <path d="M52,70 Q62,50 84,46" fill="none" stroke={C.white} strokeWidth={6} />
    </g>
  ),
  clock: (t) => (
    <g {...ln}>
      <circle cx={100} cy={100} r={80} fill={C.white} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <line key={i} x1={100 + Math.sin(a) * 66} y1={100 - Math.cos(a) * 66} x2={100 + Math.sin(a) * 74} y2={100 - Math.cos(a) * 74} strokeWidth={4} />;
      })}
      <path d="M100,100 V50" strokeWidth={7} />
      <path d="M100,100 L130,116" strokeWidth={7} stroke={t.main} />
      <circle cx={100} cy={100} r={7} fill={INK} />
    </g>
  ),
  money: (t) => (
    <g {...ln}>
      <rect x={14} y={54} width={172} height={92} rx={12} fill={t.main === "#8F9399" ? "#CDF1DF" : t.light} />
      <circle cx={100} cy={100} r={30} fill={C.white} />
      <text x={100} y={113} textAnchor="middle" fontSize={40} fontWeight={800} fontFamily="Arial, sans-serif" fill={INK} stroke="none">$</text>
      <circle cx={36} cy={76} r={5} fill={INK} stroke="none" />
      <circle cx={164} cy={124} r={5} fill={INK} stroke="none" />
    </g>
  ),
  brain: (t) => (
    <g {...ln}>
      <path d="M100,34 C72,12 28,38 40,76 C14,92 26,134 56,138 C62,166 100,172 100,150 C100,172 138,166 144,138 C174,134 186,92 160,76 C172,38 128,12 100,34 Z" fill={C.pink} />
      <path d="M100,34 V150" fill="none" strokeWidth={4} />
      <path d="M56,66 Q74,76 66,96 M144,66 Q126,76 134,96 M60,118 Q78,112 84,128 M140,118 Q122,112 116,128" fill="none" strokeWidth={4} stroke={t.main} />
    </g>
  ),
  bulb: (t) => (
    <g {...ln}>
      {[[100, 6, 100, 20], [28, 40, 40, 50], [172, 40, 160, 50], [14, 92, 30, 92], [186, 92, 170, 92]].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.main === "#8F9399" ? "#F5B419" : t.main} />
      ))}
      <path d="M72,126 C40,100 52,38 100,36 C148,38 160,100 128,126 V142 H72 Z" fill="#FDEBB5" />
      <rect x={76} y={142} width={48} height={14} rx={5} fill={C.steel} />
      <rect x={84} y={156} width={32} height={14} rx={5} fill={C.steel} />
      <path d="M86,126 V96 L100,108 L114,96 V126" fill="none" strokeWidth={4} />
    </g>
  ),
  drop: (t) => (
    <g {...ln}>
      <path d="M100,14 C100,14 42,92 42,128 C42,162 68,186 100,186 C132,186 158,162 158,128 C158,92 100,14 100,14 Z" fill={t.main === "#8F9399" ? C.water : t.light} />
      <path d="M70,130 Q72,152 92,160" fill="none" stroke={C.white} strokeWidth={8} />
    </g>
  ),
  fire: (t) => (
    <g {...ln}>
      <path d="M100,10 C108,44 150,62 150,114 C150,152 126,184 100,184 C74,184 50,152 50,114 C50,88 66,76 72,56 C84,72 90,70 92,62 C94,44 94,28 100,10 Z" fill="#EB2D2D" />
      <path d="M100,86 C106,108 128,116 128,144 C128,164 114,178 100,178 C86,178 72,164 72,144 C72,124 90,116 100,86 Z" fill="#F5B419" />
    </g>
  ),
  thermometer: (t) => (
    <g {...ln}>
      <rect x={82} y={14} width={36} height={130} rx={18} fill={C.white} />
      <circle cx={100} cy={152} r={32} fill={C.white} />
      <circle cx={100} cy={152} r={22} fill={t.main === "#8F9399" ? "#EB2D2D" : t.main} stroke="none" />
      <rect x={94} y={52} width={12} height={100} rx={6} fill={t.main === "#8F9399" ? "#EB2D2D" : t.main} stroke="none" />
      {[40, 64, 88, 112].map((y) => (
        <line key={y} x1={126} y1={y} x2={146} y2={y} strokeWidth={4} />
      ))}
    </g>
  ),
  fan: (t) => (
    <g {...ln}>
      <circle cx={100} cy={100} r={84} fill={C.white} />
      {[0, 120, 240].map((a) => (
        <ellipse key={a} cx={100} cy={52} rx={20} ry={40} fill={t.main} transform={`rotate(${a} 100 100)`} />
      ))}
      <circle cx={100} cy={100} r={13} fill={C.steel} />
    </g>
  ),
  factory: (t) => (
    <g {...ln}>
      <rect x={44} y={46} width={22} height={64} fill={C.steel} />
      <rect x={84} y={34} width={22} height={76} fill={C.steel} />
      <circle cx={56} cy={30} r={11} fill={C.white} strokeWidth={4} />
      <circle cx={76} cy={16} r={9} fill={C.white} strokeWidth={4} />
      <circle cx={98} cy={18} r={11} fill={C.white} strokeWidth={4} />
      <path d="M20,182 V104 L64,126 V104 L108,126 V104 L152,126 V92 H180 V182 Z" fill={t.main === "#8F9399" ? C.steel : t.light} />
      {[44, 82, 120].map((x) => (
        <rect key={x} x={x} y={146} width={22} height={22} rx={3} fill={C.white} strokeWidth={4} />
      ))}
    </g>
  ),
  tower: (t) => (
    <g {...ln}>
      <path d="M44,188 C66,140 66,100 48,52 H152 C134,100 134,140 156,188 Z" fill={t.main === "#8F9399" ? C.steel : t.light} />
      <path d="M62,96 H138 M58,140 H142" fill="none" strokeWidth={4} />
      <circle cx={86} cy={34} r={18} fill={C.white} />
      <circle cx={116} cy={26} r={22} fill={C.white} />
      <circle cx={140} cy={40} r={14} fill={C.white} />
    </g>
  ),
  city: (t) => (
    <g {...ln}>
      <rect x={12} y={90} width={50} height={96} fill={C.steel} />
      <rect x={66} y={34} width={58} height={152} fill={t.main === "#8F9399" ? C.dark : t.main} />
      <rect x={128} y={70} width={58} height={116} fill={t.light} />
      {[[24, 106], [24, 134], [24, 160], [80, 50], [102, 50], [80, 82], [102, 82], [80, 114], [102, 114], [80, 146], [102, 146], [140, 86], [162, 86], [140, 118], [162, 118], [140, 150], [162, 150]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={12} height={14} fill={C.white} strokeWidth={3} />
      ))}
    </g>
  ),
  globe: (t) => (
    <g {...ln}>
      <circle cx={100} cy={100} r={80} fill={t.main === "#8F9399" ? C.water : t.light} />
      <path d="M52,66 C66,48 92,52 98,68 C92,86 72,84 66,104 C52,98 40,84 52,66 Z" fill={C.leaf} strokeWidth={4} />
      <path d="M116,100 C138,92 158,106 150,132 C142,150 124,150 120,134 C112,122 108,108 116,100 Z" fill={C.leaf} strokeWidth={4} />
      <ellipse cx={100} cy={100} rx={34} ry={80} fill="none" strokeWidth={3} opacity={0.5} />
    </g>
  ),
  tree: (t) => (
    <g {...ln}>
      <path d="M90,186 V120 H112 V186 Z" fill={C.brown} />
      <circle cx={100} cy={84} r={48} fill={C.leaf} />
      <circle cx={64} cy={104} r={30} fill={C.leaf} />
      <circle cx={138} cy={104} r={30} fill={C.leaf} />
      <path d="M80,70 Q92,60 104,70" fill="none" stroke={C.white} strokeWidth={5} opacity={0.7} />
    </g>
  ),
  sun: (t) => (
    <g {...ln}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return <line key={i} x1={100 + Math.cos(a) * 58} y1={100 + Math.sin(a) * 58} x2={100 + Math.cos(a) * 88} y2={100 + Math.sin(a) * 88} stroke="#F5B419" strokeWidth={8} />;
      })}
      <circle cx={100} cy={100} r={42} fill="#F5B419" />
      <path d="M84,96 Q92,90 100,96 M104,96 Q112,90 120,96 M86,114 Q100,126 114,114" fill="none" strokeWidth={4} />
    </g>
  ),
  house: (t) => (
    <g {...ln}>
      <rect x={38} y={92} width={124} height={92} fill={C.white} />
      <path d="M20,98 L100,22 L180,98 Z" fill={t.main === "#8F9399" ? "#EB2D2D" : t.main} />
      <rect x={86} y={130} width={30} height={54} rx={4} fill={C.brown} />
      <rect x={50} y={110} width={26} height={26} fill={C.water} strokeWidth={4} />
      <rect x={126} y={110} width={26} height={26} fill={C.water} strokeWidth={4} />
    </g>
  ),
  car: (t) => (
    <g {...ln}>
      <path d="M16,138 V112 C16,104 22,100 30,98 L58,92 L80,64 H132 L156,92 L176,98 C184,100 186,106 186,114 V138 Z" fill={t.main === "#8F9399" ? "#1E82FA" : t.main} />
      <path d="M70,92 L88,72 H104 V92 Z M112,92 V72 H128 L146,92 Z" fill={C.white} strokeWidth={4} />
      <circle cx={56} cy={142} r={20} fill={C.dark} />
      <circle cx={146} cy={142} r={20} fill={C.dark} />
      <circle cx={56} cy={142} r={7} fill={C.steel} stroke="none" />
      <circle cx={146} cy={142} r={7} fill={C.steel} stroke="none" />
    </g>
  ),
  solar: (t) => (
    <g {...ln}>
      <path d="M44,46 H176 L152,130 H20 Z" fill={t.main === "#8F9399" ? "#1E82FA" : t.main} />
      <path d="M64,46 L40,130 M110,46 L94,130 M156,46 L140,130 M32,88 H164" fill="none" stroke={C.white} strokeWidth={3} />
      <path d="M86,130 V178 M60,178 H112" fill="none" />
    </g>
  ),
  turbine: (t) => (
    <g {...ln}>
      <path d="M92,184 L98,96 H106 L112,184 Z" fill={C.white} />
      {[0, 120, 240].map((a) => (
        <path key={a} d="M102,96 L96,22 L108,22 Z" fill={C.white} transform={`rotate(${a} 102 96)`} />
      ))}
      <circle cx={102} cy={96} r={9} fill={t.main === "#8F9399" ? "#1FB36B" : t.main} />
    </g>
  ),
  person: (t) => <Person mood="neutral" t={t} />,
  "person-worried": (t) => <Person mood="worried" t={t} />,
  "person-happy": (t) => <Person mood="happy" t={t} />,
  warning: (t) => (
    <g {...ln}>
      <path d="M100,18 L184,168 H16 Z" fill={t.main === "#8F9399" ? "#F5B419" : t.main} />
      <line x1={100} y1={64} x2={100} y2={118} strokeWidth={11} />
      <circle cx={100} cy={142} r={7} fill={INK} />
    </g>
  ),
  check: () => (
    <g {...ln}>
      <circle cx={100} cy={100} r={80} fill="#1FB36B" />
      <path d="M58,102 L88,132 L144,70" fill="none" stroke={C.white} strokeWidth={16} />
    </g>
  ),
  cross: () => (
    <g {...ln}>
      <circle cx={100} cy={100} r={80} fill="#EB2D2D" />
      <path d="M66,66 L134,134 M134,66 L66,134" fill="none" stroke={C.white} strokeWidth={16} />
    </g>
  ),
  rocket: (t) => (
    <g {...ln}>
      <path d="M100,12 C140,42 144,100 134,140 H66 C56,100 60,42 100,12 Z" fill={C.white} />
      <circle cx={100} cy={78} r={17} fill={C.water} />
      <path d="M66,112 L38,150 L68,142 Z M134,112 L162,150 L132,142 Z" fill={t.main === "#8F9399" ? "#EB2D2D" : t.main} />
      <path d="M80,144 C84,176 92,184 100,190 C108,184 116,176 120,144 Z" fill="#F5B419" />
    </g>
  ),
  flag: (t) => (
    <g {...ln}>
      <line x1={50} y1={16} x2={50} y2={186} strokeWidth={9} />
      <path d="M54,24 C84,10 108,38 140,24 C150,22 156,26 160,28 V100 C128,114 106,88 54,102 Z" fill={t.main === "#8F9399" ? "#EB2D2D" : t.main} />
    </g>
  ),
  gear: (t) => (
    <g {...ln}>
      <path d={gearPath(100, 100, 60, 82, 8)} fill={t.main === "#8F9399" ? C.steel : t.main} />
      <circle cx={100} cy={100} r={26} fill={C.white} />
    </g>
  ),
};

/** Colour each asset wears when the scene does not pick a tint. */
const DEFAULT_TINT: Partial<Record<SceneAsset, SceneTint>> = {
  server: "green", laptop: "blue", phone: "blue", cloud: "blue", database: "blue", chip: "green", robot: "red", wifi: "blue", plug: "blue",
  bolt: "gold", battery: "green", lock: "gold", shield: "blue", chart: "blue", document: "blue", magnifier: "blue", clock: "red",
  brain: "blue", bulb: "gold", drop: "blue", thermometer: "red", fan: "blue", factory: "gray", tower: "gray", city: "blue", globe: "blue",
  house: "red", car: "blue", solar: "blue", turbine: "green", person: "blue", "person-worried": "red", "person-happy": "green",
  warning: "gold", rocket: "red", flag: "red", gear: "gray",
};
export const resolveTint = (tint: SceneTint | undefined, asset?: SceneAsset): P => TINTS[tint ?? (asset && DEFAULT_TINT[asset]) ?? "gray"];
