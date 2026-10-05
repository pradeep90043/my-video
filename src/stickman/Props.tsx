import React from "react";
import { interpolate } from "remotion";
import type { PropType } from "./schema";
import type { Theme } from "./theme";

/**
 * Line-art props. Each is drawn around (0,0) inside roughly ±120 units and
 * animates from `t` (frames since the prop appeared).
 */
interface DrawProps {
  t: number;
  theme: Theme;
  color: string;
}

const sw = 9;
const base = (theme: Theme) => ({
  stroke: theme.ink,
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
});

const grow = (t: number, delay: number, dur = 18) =>
  interpolate(t, [delay, delay + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Laptop: React.FC<DrawProps> = ({ t, theme, color }) => (
  <g {...base(theme)}>
    <rect x={-110} y={-90} width={220} height={140} rx={10} fill={theme.bg} />
    <path d="M-135,70 L135,70 L112,50 L-112,50 Z" fill={theme.bg} />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M-85,${-62 + i * 28} h${(40 + ((i * 53) % 90)) * grow(t, 6 + i * 6, 14)}`} stroke={i % 2 ? theme.ink : color} strokeWidth={8} />
    ))}
  </g>
);

const Bulb: React.FC<DrawProps> = ({ t, theme, color }) => {
  const pulse = 1 + Math.sin(t * 0.25) * 0.06;
  return (
    <g {...base(theme)}>
      <g stroke={color} strokeWidth={8} opacity={grow(t, 8)}>
        {[-60, -30, 0, 30, 60].map((a) => (
          <path key={a} d={`M${Math.sin((a * Math.PI) / 180) * 105 * pulse},${-40 - Math.cos((a * Math.PI) / 180) * 105 * pulse} l${Math.sin((a * Math.PI) / 180) * 26},${-Math.cos((a * Math.PI) / 180) * 26}`} />
        ))}
      </g>
      <circle cy={-40} r={68} fill={color} fillOpacity={0.25 * grow(t, 4)} />
      <path d="M-22,34 h44 M-18,54 h36 M-10,74 h20" />
      <path d="M-16,26 C-16,0 -4,-6 -4,-24 M16,26 C16,0 4,-6 4,-24" strokeWidth={6} />
    </g>
  );
};

const Chart: React.FC<DrawProps & { up: boolean }> = ({ t, theme, color, up }) => {
  const heights = up ? [40, 75, 110, 150] : [150, 110, 75, 40];
  return (
    <g {...base(theme)}>
      <path d="M-120,90 V-100 M-120,90 H125" />
      {heights.map((h, i) => (
        <rect key={i} x={-90 + i * 55} y={90 - h * grow(t, i * 6, 16)} width={38} height={h * grow(t, i * 6, 16)} fill={i === 3 ? color : theme.faint} stroke={theme.ink} strokeWidth={6} />
      ))}
      <g stroke={color} strokeWidth={10} opacity={grow(t, 26)}>
        {up ? <path d="M-100,10 L-10,-45 L40,-20 L110,-90 M70,-90 H110 V-50" /> : <path d="M-100,-80 L-10,-30 L40,-55 L110,15 M70,15 H110 V-25" />}
      </g>
    </g>
  );
};

const Warning: React.FC<DrawProps> = ({ t, theme, color }) => {
  const shake = Math.sin(t * 1.4) * 3 * (t < 30 ? 1 : 0.3);
  return (
    <g {...base(theme)} transform={`rotate(${shake})`}>
      <path d="M0,-105 L110,85 L-110,85 Z" fill={color} fillOpacity={0.2} stroke={color} />
      <path d="M0,-40 V30" stroke={theme.ink} strokeWidth={14} />
      <circle cy={58} r={2} stroke={theme.ink} strokeWidth={16} />
    </g>
  );
};

const Clock: React.FC<DrawProps> = ({ t, theme, color }) => (
  <g {...base(theme)}>
    <circle r={100} fill={theme.bg} />
    <path d="M0,-82 v10 M82,0 h-10 M0,82 v-10 M-82,0 h10" strokeWidth={7} />
    <path d="M0,0 L0,-62" stroke={color} transform={`rotate(${t * 6})`} />
    <path d="M0,0 L40,0" transform={`rotate(${t * 0.5 - 90})`} />
  </g>
);

const Money: React.FC<DrawProps> = ({ t, theme, color }) => (
  <g {...base(theme)} transform={`translate(0,${Math.sin(t * 0.15) * 6})`}>
    <circle r={92} fill={color} fillOpacity={0.3} stroke={color} />
    <circle r={68} strokeWidth={5} />
    <text textAnchor="middle" y={26} fontSize={84} fontWeight={900} fontFamily="Montserrat, Inter, sans-serif" fill={theme.ink} stroke="none">$</text>
  </g>
);

const Robot: React.FC<DrawProps> = ({ t, theme, color }) => {
  const blink = t % 70 > 65;
  return (
    <g {...base(theme)}>
      <path d="M0,-98 V-70" />
      <circle cy={-108} r={10} fill={color} stroke={color} />
      <rect x={-85} y={-70} width={170} height={140} rx={24} fill={theme.bg} />
      <rect x={-92} y={-18} width={14} height={40} rx={6} fill={theme.faint} />
      <rect x={78} y={-18} width={14} height={40} rx={6} fill={theme.faint} />
      {blink ? <path d="M-50,-22 h24 M26,-22 h24" strokeWidth={7} /> : <><rect x={-52} y={-34} width={28} height={28} rx={6} fill={color} stroke="none" /><rect x={24} y={-34} width={28} height={28} rx={6} fill={color} stroke="none" /></>}
      <path d="M-44,30 H44 M-22,16 V44 M0,16 V44 M22,16 V44" strokeWidth={6} />
    </g>
  );
};

const Question: React.FC<DrawProps> = ({ t, theme, color }) => (
  <text textAnchor="middle" y={70} fontSize={250} fontWeight={900} fontFamily="Montserrat, Inter, sans-serif" fill={color} stroke={theme.ink} strokeWidth={6} transform={`rotate(${Math.sin(t * 0.12) * 6})`}>?</text>
);

const Check: React.FC<DrawProps> = ({ t, theme, color }) => {
  const p = grow(t, 0, 14);
  return (
    <g {...base(theme)}>
      <circle r={100} fill={color} fillOpacity={0.18} stroke={color} />
      <path d="M-50,5 L-15,42 L55,-40" stroke={color} strokeWidth={20} strokeDasharray={200} strokeDashoffset={200 * (1 - p)} />
    </g>
  );
};

const Cross: React.FC<DrawProps> = ({ t, theme, color }) => {
  const p = grow(t, 0, 14);
  return (
    <g {...base(theme)}>
      <circle r={100} fill={color} fillOpacity={0.18} stroke={color} />
      <g stroke={color} strokeWidth={20} strokeDasharray={120} strokeDashoffset={120 * (1 - p)}>
        <path d="M-42,-42 L42,42" />
        <path d="M42,-42 L-42,42" />
      </g>
    </g>
  );
};

const Rocket: React.FC<DrawProps> = ({ t, theme, color }) => {
  const rise = Math.sin(t * 0.14) * 8;
  const flame = 28 + Math.sin(t * 1.6) * 10;
  return (
    <g {...base(theme)} transform={`translate(0,${rise}) rotate(18)`}>
      <path d="M0,-115 C48,-70 48,20 30,60 H-30 C-48,20 -48,-70 0,-115 Z" fill={theme.bg} />
      <circle cy={-36} r={20} fill={color} stroke={theme.ink} strokeWidth={6} />
      <path d="M-30,30 L-62,70 L-30,58 M30,30 L62,70 L30,58" fill={color} fillOpacity={0.4} stroke={color} />
      <path d={`M-16,72 Q0,${72 + flame * 1.4} 16,72`} stroke={color} />
    </g>
  );
};

const Lock: React.FC<DrawProps> = ({ t, theme, color }) => {
  const lift = interpolate(t, [4, 16], [-18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <g {...base(theme)}>
      <path d={`M-42,-10 V-42 A42,42 0 0 1 42,-42 V${-10 + lift * 0.5}`} transform={`translate(0,${lift})`} />
      <rect x={-70} y={-12} width={140} height={110} rx={16} fill={color} fillOpacity={0.25} stroke={theme.ink} />
      <circle cy={38} r={11} fill={theme.ink} />
      <path d="M0,46 V68" />
    </g>
  );
};

const Gear: React.FC<DrawProps> = ({ t, theme, color }) => (
  <g {...base(theme)} transform={`rotate(${t * 2})`}>
    {Array.from({ length: 8 }).map((_, i) => (
      <rect key={i} x={-14} y={-108} width={28} height={36} rx={6} fill={color} stroke={theme.ink} strokeWidth={6} transform={`rotate(${i * 45})`} />
    ))}
    <circle r={78} fill={theme.bg} />
    <circle r={30} />
  </g>
);

const Magnifier: React.FC<DrawProps> = ({ t, theme, color }) => (
  <g {...base(theme)} transform={`translate(${Math.sin(t * 0.1) * 14},${Math.cos(t * 0.1) * 8})`}>
    <circle cx={-14} cy={-14} r={70} fill={color} fillOpacity={0.15} />
    <path d="M36,36 L100,100" strokeWidth={18} />
    <path d="M-50,-30 A40,40 0 0 1 -20,-58" stroke={color} strokeWidth={7} />
  </g>
);

const Bug: React.FC<DrawProps> = ({ t, theme, color }) => {
  const wig = Math.sin(t * 1.2) * 6;
  return (
    <g {...base(theme)}>
      <ellipse rx={52} ry={66} fill={color} fillOpacity={0.35} stroke={theme.ink} />
      <circle cy={-76} r={24} fill={theme.bg} />
      <path d={`M-52,-20 L-90,${-34 + wig} M-52,10 L-92,${10 - wig} M-52,40 L-86,${64 + wig} M52,-20 L90,${-34 - wig} M52,10 L92,${10 + wig} M52,40 L86,${64 - wig}`} strokeWidth={7} />
      <path d="M0,-50 V60" strokeWidth={6} />
      <path d="M-10,-96 L-24,-122 M10,-96 L24,-122" strokeWidth={6} />
    </g>
  );
};

const Code: React.FC<DrawProps> = ({ t, theme, color }) => (
  <g {...base(theme)}>
    <rect x={-120} y={-84} width={240} height={168} rx={14} fill={theme.bg} />
    <path d="M-120,-48 H120" strokeWidth={6} />
    <circle cx={-96} cy={-66} r={4} fill={color} stroke="none" />
    <circle cx={-78} cy={-66} r={4} fill={theme.ink} stroke="none" />
    <text textAnchor="middle" y={42} fontSize={78} fontWeight={800} fontFamily="'Fira Code', monospace" fill={color} stroke="none" opacity={grow(t, 4)}>{"</>"}</text>
  </g>
);

const REGISTRY: Record<PropType, React.FC<DrawProps>> = {
  laptop: Laptop, bulb: Bulb,
  chartUp: (p) => <Chart {...p} up />,
  chartDown: (p) => <Chart {...p} up={false} />,
  warning: Warning, clock: Clock, money: Money, robot: Robot, question: Question,
  check: Check, cross: Cross, rocket: Rocket, lock: Lock, gear: Gear,
  magnifier: Magnifier, bug: Bug, code: Code,
};

export const PropDrawing: React.FC<DrawProps & { type: PropType }> = ({ type, ...rest }) => {
  const C = REGISTRY[type];
  return <C {...rest} />;
};
