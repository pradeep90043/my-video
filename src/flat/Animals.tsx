import React from "react";
import { shade } from "./spec";

/**
 * Flat animals, side view, facing right, standing on y = 0 in the same units as a person (an adult is about 1000 tall).
 * Each one idles on its own (tail swish, head bob, breathing) and walks with its legs when it moves. Animals that can be
 * ridden say where the rider sits (`SADDLE`).
 */

export const SADDLE: Record<string, { x: number; y: number } | undefined> = {
  horse: { x: -20, y: -640 }, elephant: { x: -60, y: -1000 }, lion: { x: -30, y: -560 }, cow: { x: -40, y: -560 },
};

const DEFAULTS: Record<string, string> = {
  cow: "#f3ece0", elephant: "#9aa3ad", horse: "#8a5a3a", peacock: "#1f6fb8", snake: "#3f8f5a", mouse: "#9a9aa6",
  bird: "#e0603a", lion: "#d9a046", deer: "#c4884e", dog: "#b07a4a",
};

/** four legs: two pairs that swing opposite to each other while walking */
function Legs({ xs, top, len, w, col, colFar, phase, walking, hoof }: { xs: number[]; top: number; len: number; w: number; col: string; colFar: string; phase: number; walking: boolean; hoof?: string }) {
  return (
    <g>
      {xs.map((x, i) => {
        const sw = walking ? Math.sin(phase * Math.PI * 2 + (i % 2 ? Math.PI : 0)) * 0.32 : 0;
        const fx = x + Math.sin(sw) * len, fy = top + Math.cos(sw) * len;
        const far = i >= 2;
        return (
          <g key={i}>
            <line x1={x} y1={top} x2={fx} y2={fy} stroke={far ? colFar : col} strokeWidth={w} strokeLinecap="round" />
            {hoof && <rect x={fx - w / 2} y={fy - 6} width={w} height={20} rx={4} fill={hoof} />}
          </g>
        );
      })}
    </g>
  );
}

const Eye = ({ x, y, r = 9 }: { x: number; y: number; r?: number }) => <g><circle cx={x} cy={y} r={r} fill="#1b1414" /><circle cx={x + r * 0.3} cy={y - r * 0.3} r={r * 0.3} fill="#fff" /></g>;

export const Animal: React.FC<{ kind: string; color?: string; t: number; walking: boolean; silhouette?: boolean }> = ({ kind, color, t, walking, silhouette }) => {
  const c = color ?? DEFAULTS[kind] ?? "#999";
  const d = shade(c, -0.18), l = shade(c, 0.25);
  const ph = t * 1.4;
  const swish = Math.sin(t * 2.2) * 10, nod = Math.sin(t * 1.3) * 4 + (walking ? Math.sin(ph * Math.PI * 4) * 6 : 0);
  const bob = walking ? Math.abs(Math.sin(ph * Math.PI * 2)) * -10 : Math.sin(t * 1.8) * 2;
  let body: React.ReactNode;
  switch (kind) {
    case "cow": body = (
      <g>
        <path d={`M -360 -470 Q -400 ${-420 + swish} -410 -260`} stroke={d} strokeWidth={14} fill="none" strokeLinecap="round" />
        <Legs xs={[-250, 210, -200, 260]} top={-300} len={260} w={48} col={c} colFar={d} phase={ph} walking={walking} hoof="#3a2a20" />
        <rect x={-380} y={-560} width={680} height={300} rx={120} fill={c} />
        <ellipse cx={-160} cy={-470} rx={90} ry={60} fill="#3a2f2a" opacity={0.85} /><ellipse cx={120} cy={-380} rx={70} ry={50} fill="#3a2f2a" opacity={0.85} />
        <ellipse cx={-20} cy={-262} rx={60} ry={28} fill="#f0b6b6" />
        <g transform={`translate(330 ${-560 + nod}) rotate(12)`}>
          <path d="M -30 -40 Q -60 -120 -20 -130 M 30 -40 Q 60 -120 20 -130" stroke="#efe6d2" strokeWidth={16} fill="none" strokeLinecap="round" />
          <ellipse cx={0} cy={20} rx={80} ry={110} fill={c} />
          <ellipse cx={-70} cy={-20} rx={40} ry={18} fill={d} /><ellipse cx={70} cy={-20} rx={40} ry={18} fill={d} />
          <ellipse cx={0} cy={100} rx={70} ry={50} fill="#f0b6b6" /><circle cx={-22} cy={100} r={8} fill="#7a4545" /><circle cx={22} cy={100} r={8} fill="#7a4545" />
          <Eye x={-34} y={10} /><Eye x={34} y={10} />
          <circle cx={0} cy={150} r={18} fill="#d8b04a" />
        </g>
      </g>
    ); break;
    case "elephant": body = (
      <g>
        <path d={`M -470 -720 Q -520 ${-640 + swish} -505 -520`} stroke={d} strokeWidth={16} fill="none" strokeLinecap="round" />
        <Legs xs={[-330, 260, -260, 330]} top={-420} len={400} w={120} col={c} colFar={d} phase={ph * 0.8} walking={walking} hoof={l} />
        <path d="M -480 -560 Q -500 -980 -60 -1000 Q 300 -1000 360 -760 Q 380 -560 300 -440 L -440 -440 Q -490 -480 -480 -560 Z" fill={c} />
        <g transform={`translate(0 ${nod})`}>
          <path d="M 300 -900 Q 470 -940 490 -760 Q 520 -560 470 -360 Q 456 -300 410 -320 Q 440 -420 430 -560 Q 420 -700 330 -720 Z" fill={c} />
          <path d="M 200 -960 Q 60 -980 70 -760 Q 80 -620 220 -640 Q 300 -700 260 -880 Z" fill={d} />
          <path d="M 440 -620 Q 520 -600 540 -560" stroke="#f6f0e2" strokeWidth={26} fill="none" strokeLinecap="round" />
          <Eye x={390} y={-800} r={11} />
        </g>
        <rect x={-300} y={-1010} width={420} height={60} rx={20} fill="#c0392b" opacity={0.92} />
        <path d="M -300 -950 L -260 -780 L 80 -780 L 120 -950 Z" fill="#c0392b" opacity={0.92} /><path d="M -260 -800 L 80 -800" stroke="#f2b53a" strokeWidth={14} />
      </g>
    ); break;
    case "horse": body = (
      <g>
        <path d={`M -300 -560 Q -380 ${-470 + swish} -360 -300`} stroke={d} strokeWidth={34} fill="none" strokeLinecap="round" />
        <Legs xs={[-230, 200, -180, 250]} top={-360} len={330} w={40} col={c} colFar={d} phase={ph} walking={walking} hoof="#2a1d16" />
        <ellipse cx={-10} cy={-470} rx={300} ry={140} fill={c} />
        <g transform={`translate(230 ${-540 + nod})`}>
          <path d="M -40 40 L 30 -200 Q 60 -250 110 -230 L 200 -150 Q 220 -120 190 -100 L 90 -120 L 60 40 Z" fill={c} />
          <path d="M 20 -200 Q -10 -120 -40 -20" stroke="#2a1d16" strokeWidth={30} fill="none" strokeLinecap="round" />
          <path d="M 70 -240 L 60 -290 L 100 -250 Z" fill={d} />
          <Eye x={110} y={-185} r={9} />
        </g>
        <path d="M -80 -610 L 120 -610 L 140 -560 L -100 -560 Z" fill="#7a2a20" /><rect x={-120} y={-560} width={260} height={30} fill="#b5843f" />
      </g>
    ); break;
    case "peacock": {
      const fan = 0.92 + 0.08 * Math.sin(t * 1.2);
      body = (
        <g>
          <g transform={`translate(-40 -260) scale(${fan})`}>
            {Array.from({ length: 13 }, (_, i) => {
              const a = (-160 + i * 11.5) * Math.PI / 180, r = 360;
              return <g key={i}><line x1={0} y1={0} x2={Math.cos(a) * r} y2={Math.sin(a) * r} stroke="#2f8f5b" strokeWidth={34} strokeLinecap="round" />
                <ellipse cx={Math.cos(a) * (r - 20)} cy={Math.sin(a) * (r - 20)} rx={26} ry={34} fill="#1f5fa8" transform={`rotate(${(a * 180) / Math.PI + 90} ${Math.cos(a) * (r - 20)} ${Math.sin(a) * (r - 20)})`} />
                <circle cx={Math.cos(a) * (r - 20)} cy={Math.sin(a) * (r - 20)} r={11} fill="#f2c14e" /></g>;
            })}
          </g>
          <Legs xs={[-40, 20]} top={-120} len={120} w={12} col="#c9a15a" colFar="#c9a15a" phase={ph} walking={walking} />
          <ellipse cx={-10} cy={-200} rx={90} ry={110} fill={c} />
          <g transform={`translate(40 ${-330 + nod})`}>
            <path d="M -20 60 Q -10 -40 20 -90 L 40 -80 Q 20 -20 30 60 Z" fill={c} />
            <circle cx={30} cy={-95} r={30} fill={c} /><Eye x={38} y={-100} r={6} />
            <path d="M 56 -98 L 80 -90 L 56 -84 Z" fill="#e9b43a" />
            {[-20, 0, 20].map((x) => <g key={x}><line x1={30 + x * 0.4} y1={-125} x2={30 + x} y2={-165} stroke={c} strokeWidth={4} /><circle cx={30 + x} cy={-168} r={7} fill={c} /></g>)}
          </g>
        </g>
      );
      break;
    }
    case "snake": body = (
      <g>
        <path d={`M -260 -30 Q -180 -100 -100 -30 Q -20 40 60 -30 Q 120 -80 120 ${-180 + nod}`} stroke={c} strokeWidth={46} fill="none" strokeLinecap="round" />
        <path d={`M -260 -30 Q -180 -100 -100 -30 Q -20 40 60 -30`} stroke={l} strokeWidth={10} fill="none" strokeDasharray="20 30" />
        <g transform={`translate(120 ${-220 + nod})`}>
          <ellipse cx={0} cy={0} rx={80} ry={64} fill={c} /><ellipse cx={0} cy={10} rx={40} ry={34} fill={l} />
          <Eye x={-24} y={-14} r={7} /><Eye x={24} y={-14} r={7} />
          <path d={`M 0 30 L 0 ${50 + Math.max(0, Math.sin(t * 6)) * 20} M 0 ${50 + Math.max(0, Math.sin(t * 6)) * 20} l -8 10 M 0 ${50 + Math.max(0, Math.sin(t * 6)) * 20} l 8 10`} stroke="#d6453a" strokeWidth={4} />
        </g>
      </g>
    ); break;
    case "mouse": body = (
      <g>
        <path d={`M -70 -40 Q -140 ${-60 + swish} -170 -20`} stroke="#e8a3a3" strokeWidth={6} fill="none" />
        <ellipse cx={0} cy={-50} rx={80} ry={50} fill={c} />
        <g transform={`translate(70 ${-70 + nod * 0.5})`}><circle cx={0} cy={-30} r={26} fill={c} /><circle cx={0} cy={-30} r={14} fill="#e8a3a3" />
          <path d="M -10 0 Q 30 -10 50 14 Q 20 26 -10 20 Z" fill={c} /><Eye x={20} y={2} r={5} /><circle cx={50} cy={14} r={5} fill="#d66" /></g>
        <Legs xs={[-40, 40]} top={-14} len={14} w={10} col={d} colFar={d} phase={ph * 2} walking={walking} />
      </g>
    ); break;
    case "bird": {
      const flap = Math.sin(t * 10) * 30;
      body = (
        <g transform="translate(0 -60)">
          <ellipse cx={0} cy={0} rx={70} ry={44} fill={c} />
          <path d={`M -20 -10 Q -30 ${-90 - flap} -100 ${-60 - flap} Q -60 -20 -20 -10 Z`} fill={d} />
          <circle cx={60} cy={-30} r={30} fill={c} /><Eye x={70} y={-36} r={5} /><path d="M 88 -32 L 112 -24 L 88 -18 Z" fill="#e9b43a" />
          <path d="M -70 0 L -120 -16 L -116 14 Z" fill={d} />
        </g>
      );
      break;
    }
    case "lion": body = (
      <g>
        <path d={`M -300 -400 Q -380 ${-330 + swish} -360 -220`} stroke={c} strokeWidth={18} fill="none" strokeLinecap="round" /><circle cx={-360} cy={-220} r={20} fill="#7a4a1a" />
        <Legs xs={[-220, 180, -170, 230]} top={-300} len={290} w={56} col={c} colFar={d} phase={ph} walking={walking} />
        <ellipse cx={-20} cy={-400} rx={290} ry={130} fill={c} />
        <g transform={`translate(250 ${-500 + nod})`}>
          {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <circle key={i} cx={Math.cos(a) * 120} cy={Math.sin(a) * 120} r={60} fill="#8a4f1c" />; })}
          <circle cx={0} cy={0} r={115} fill="#8a4f1c" /><circle cx={10} cy={0} r={85} fill={c} />
          <Eye x={-14} y={-20} r={9} /><Eye x={40} y={-20} r={9} />
          <path d="M 2 20 L 30 20 L 16 36 Z" fill="#3a2015" /><path d="M -10 52 Q 16 66 42 52" stroke="#3a2015" strokeWidth={5} fill="none" />
        </g>
      </g>
    ); break;
    case "deer": body = (
      <g>
        <Legs xs={[-180, 170, -140, 210]} top={-320} len={330} w={30} col={c} colFar={d} phase={ph} walking={walking} hoof="#2a1d16" />
        <ellipse cx={0} cy={-420} rx={240} ry={110} fill={c} />
        {[-120, -40, 40, 120].map((x) => <circle key={x} cx={x} cy={-450 + (x % 80) * 0.3} r={14} fill="#f3e6d2" />)}
        <g transform={`translate(200 ${-500 + nod})`}>
          <path d="M -30 40 L 10 -170 L 60 -170 L 60 40 Z" fill={c} />
          <ellipse cx={70} cy={-180} rx={60} ry={42} fill={c} /><Eye x={84} y={-190} r={8} />
          <path d="M 20 -210 Q 0 -300 -40 -330 M 10 -260 Q -30 -270 -50 -250 M 50 -215 Q 70 -310 110 -340 M 70 -270 Q 100 -280 120 -260" stroke="#7a5230" strokeWidth={10} fill="none" strokeLinecap="round" />
        </g>
        <path d="M -240 -460 L -270 -500 L -230 -480 Z" fill="#f3e6d2" />
      </g>
    ); break;
    case "dog": body = (
      <g>
        <path d={`M -200 -300 Q -260 ${-380 + swish * 2} -240 -420`} stroke={c} strokeWidth={22} fill="none" strokeLinecap="round" />
        <Legs xs={[-150, 120, -110, 160]} top={-200} len={190} w={38} col={c} colFar={d} phase={ph * 1.3} walking={walking} />
        <ellipse cx={-20} cy={-270} rx={200} ry={90} fill={c} />
        <g transform={`translate(170 ${-340 + nod})`}>
          <circle cx={0} cy={0} r={80} fill={c} /><path d="M 40 10 Q 120 20 120 50 Q 100 70 40 60 Z" fill={l} /><circle cx={118} cy={38} r={14} fill="#2a1d16" />
          <ellipse cx={-50} cy={20} rx={30} ry={60} fill={d} /><Eye x={30} y={-14} r={9} />
        </g>
      </g>
    ); break;
    default: body = <ellipse cx={0} cy={-200} rx={200} ry={120} fill={c} />;
  }
  return <g transform={`translate(0 ${bob})`} style={silhouette ? { filter: "brightness(0)" } : undefined}>{body}</g>;
};
