import React from "react";
import { STORY_FONT } from "./font";import type { StoryBgName, StoryTime } from "./cast";

/** Illustrated story backgrounds (flat colour, layered, gently animated). Drawn in the scene's world coordinates. */
interface Props { bg: StoryBgName; time: StoryTime; frame: number; w: number; h: number; ground: number }

const OUT = "#2B2B2B";
const PAL = {
  day: { sky: ["#7EC8F2", "#E9F7FF"], far: "#9CCFA0", mid: "#6DB57A", near: "#4F9D5E", ground: "#8BC46B", light: 1, wall: "#F3E5C8" },
  dusk: { sky: ["#6C5BA6", "#F8A66B"], far: "#7C6AA0", mid: "#5E5088", near: "#46406E", ground: "#6B7A55", light: 0.82, wall: "#E6C9A4" },
  night: { sky: ["#07142E", "#2B3F78"], far: "#1E2D54", mid: "#172444", near: "#101A36", ground: "#24365A", light: 0.5, wall: "#4A5578" },
} as const;

const dim = (hex: string, k: number): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
};

export const StoryBackground: React.FC<Props> = ({ bg, time, frame, w, h, ground }) => {
  const P = PAL[time];
  const k = P.light;
  const c = (hex: string) => dim(hex, k);
  const id = `sky-${bg}-${time}`;
  const drift = (speed: number, span: number, off = 0) => ((frame * speed + off) % span);
  const star = (i: number) => 0.3 + 0.7 * Math.abs(Math.sin(frame * 0.05 + i * 1.9));
  const interior = bg === "home" || bg === "room_night" || bg === "office" || bg === "bank" || bg === "stock" || bg === "newsroom" || bg === "studio";

  const sky = (
    <g>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.sky[0]} /><stop offset="1" stopColor={P.sky[1]} /></linearGradient></defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
      {time === "night" && Array.from({ length: 34 }, (_, i) => <circle key={i} cx={(i * 197) % w} cy={40 + ((i * 131) % (ground * 0.55))} r={1.6 + (i % 3)} fill="#fff" opacity={star(i)} />)}
      {time === "night" ? (
        <g><circle cx={w * 0.78} cy={ground * 0.22} r={70} fill="#F7F3D0" /><circle cx={w * 0.78 + 26} cy={ground * 0.22 - 12} r={60} fill={P.sky[0]} opacity={0.0} /></g>
      ) : (
        <g><circle cx={w * (time === "dusk" ? 0.2 : 0.8)} cy={ground * (time === "dusk" ? 0.5 : 0.2)} r={time === "dusk" ? 110 : 80} fill={time === "dusk" ? "#FFD27A" : "#FFE27A"} opacity={0.95} /></g>
      )}
      {time !== "night" && [0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${((drift(0.4 + i * 0.15, w + 500, i * 400) - 250))},${ground * (0.12 + i * 0.1)}) scale(${1.2 + i * 0.3})`} opacity={0.9}>
          <path d="M0,40 q0,-34 38,-34 q10,-30 50,-22 q40,-8 56,24 q36,4 30,32 z" fill={time === "dusk" ? "#FFD9B8" : "#fff"} />
        </g>
      ))}
    </g>
  );

  const floor = (col: string, top = ground) => <rect x={0} y={top} width={w} height={h - top} fill={col} />;
  const hills = (col: string, base: number, amp: number, seed: number) => {
    const pts = Array.from({ length: 9 }, (_, i) => `${i * (w / 8)},${base - amp * Math.abs(Math.sin(i * 1.3 + seed))}`).join(" L");
    return <path d={`M0,${ground} L${pts} L${w},${ground} Z`} fill={col} />;
  };
  const tree = (x: number, base: number, s: number, col = "#3E8E4F") => (
    <g transform={`translate(${x},${base}) scale(${s})`}>
      <rect x={-10} y={-110} width={20} height={110} fill={c("#7B5230")} stroke={OUT} strokeWidth={3} />
      <circle cx={0} cy={-150} r={62} fill={c(col)} stroke={OUT} strokeWidth={3} />
      <circle cx={-40} cy={-120} r={40} fill={c(col)} stroke={OUT} strokeWidth={3} />
      <circle cx={42} cy={-122} r={42} fill={c(col)} stroke={OUT} strokeWidth={3} />
    </g>
  );
  const pine = (x: number, base: number, s: number) => (
    <g transform={`translate(${x},${base}) scale(${s})`}>
      <rect x={-8} y={-40} width={16} height={40} fill={c("#6B4A2B")} />
      {[0, 1, 2].map((i) => <path key={i} d={`M${-70 + i * 12},${-30 - i * 70} L0,${-130 - i * 70} L${70 - i * 12},${-30 - i * 70} Z`} fill={c(i % 2 ? "#2F7D4A" : "#3A8F57")} stroke={OUT} strokeWidth={3} />)}
    </g>
  );
  const hut = (x: number, base: number, s: number) => (
    <g transform={`translate(${x},${base}) scale(${s})`}>
      <rect x={-90} y={-120} width={180} height={120} fill={c("#D9A066")} stroke={OUT} strokeWidth={3} />
      <path d="M-120,-118 L0,-215 L120,-118 Z" fill={c("#B8860B")} stroke={OUT} strokeWidth={3} />
      <rect x={-22} y={-86} width={44} height={86} fill={c("#6B4A2B")} stroke={OUT} strokeWidth={3} />
      <rect x={42} y={-96} width={30} height={30} fill={time === "night" ? "#FFE08A" : c("#9FD3F0")} stroke={OUT} strokeWidth={3} />
    </g>
  );
  const building = (x: number, base: number, bw: number, bh: number, col: string, lit = 0.25) => (
    <g>
      <rect x={x} y={base - bh} width={bw} height={bh} fill={c(col)} stroke={OUT} strokeWidth={3} />
      {Array.from({ length: Math.floor(bh / 70) }, (_, r) => Array.from({ length: Math.max(1, Math.floor(bw / 60)) }, (_, cc) => (
        <rect key={`${r}-${cc}`} x={x + 16 + cc * 56} y={base - bh + 18 + r * 70} width={30} height={38} fill={time === "night" && ((r * 3 + cc) % 4 === 0 || lit > 0.5) ? "#FFE08A" : c("#BFE3F7")} stroke={OUT} strokeWidth={2} />
      )))}
    </g>
  );
  const bird = (i: number) => <path key={i} d="M0,0 q10,-12 20,0 q10,-12 20,0" fill="none" stroke={OUT} strokeWidth={3} transform={`translate(${((drift(1.6, w + 200, i * 260)) - 100)},${120 + i * 50 + Math.sin(frame * 0.1 + i) * 8})`} />;

  let body: React.ReactNode = null;
  switch (bg) {
    case "village":
      body = (<g>{hills(c(P.far), ground - 40, 130, 1)}{hills(c(P.mid), ground - 10, 70, 3)}{floor(c(P.ground))}
        {hut(w * 0.14, ground + 10, 1.05)}{hut(w * 0.84, ground + 14, 0.9)}{tree(w * 0.46, ground - 6, 0.9)}
        <path d={`M${w * 0.3},${h} Q${w * 0.5},${ground + 30} ${w * 0.62},${ground}`} stroke={c("#D2B48C")} strokeWidth={90} fill="none" opacity={0.7} />
        {[0, 1].map(bird)}</g>); break;
    case "forest":
      body = (<g>{hills(c(P.far), ground - 30, 90, 2)}{[0.05, 0.22, 0.4, 0.62, 0.8, 0.95].map((p, i) => pine(w * p, ground - 20 + (i % 2) * 14, 1.1 + (i % 3) * 0.25))}{floor(c(P.ground))}
        {[0.1, 0.35, 0.7, 0.9].map((p, i) => tree(w * p, ground + 40 + i * 6, 1.1 + (i % 2) * 0.3, "#2F7D4A"))}
        {time === "night" && Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(i * 211 + Math.sin(frame * 0.03 + i) * 30) % w} cy={ground - 120 - (i % 5) * 60 + Math.cos(frame * 0.04 + i) * 20} r={4} fill="#F6FF7A" opacity={0.4 + 0.6 * Math.abs(Math.sin(frame * 0.08 + i))} />)}</g>); break;
    case "river":
      body = (<g>{hills(c(P.far), ground - 60, 160, 5)}{floor(c(P.ground))}
        <path d={`M0,${ground + 40} Q${w * 0.3},${ground - 10} ${w * 0.6},${ground + 40} T${w},${ground + 30} L${w},${h} L0,${h} Z`} fill={c("#4FA3D9")} />
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${(i * 260 + frame * 1.2) % (w + 100) - 50},${ground + 90 + i * 40} q30,-12 60,0`} stroke="#fff" strokeWidth={4} fill="none" opacity={0.6} />)}
        {tree(w * 0.1, ground + 20, 0.9)}{tree(w * 0.9, ground + 30, 1)}</g>); break;
    case "road":
      body = (<g>{hills(c(P.far), ground - 50, 150, 6)}{floor(c("#8B93A0"), ground - 30)}
        <rect x={0} y={ground - 30} width={w} height={h - ground + 30} fill={c("#59606B")} />
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={((i * 260 - frame * 4) % (w + 260) + w + 260) % (w + 260) - 130} y={ground + 120} width={140} height={14} fill="#F5F1E6" />)}
        {pine(w * 0.08, ground - 30, 0.9)}{pine(w * 0.92, ground - 30, 1)}
        <g transform={`translate(${w * 0.7},${ground - 30})`}><rect x={-6} y={-200} width={12} height={200} fill={c("#6B4A2B")} /><rect x={-70} y={-250} width={140} height={60} fill={c("#2E86DE")} stroke={OUT} strokeWidth={3} /></g></g>); break;
    case "mountain":
      body = (<g><path d={`M0,${ground} L${w * 0.2},${ground - 420} L${w * 0.38},${ground} Z`} fill={c("#8AA0B8")} /><path d={`M${w * 0.25},${ground} L${w * 0.55},${ground - 560} L${w * 0.85},${ground} Z`} fill={c("#6F88A6")} stroke={OUT} strokeWidth={3} />
        <path d={`M${w * 0.55 - 70},${ground - 460} L${w * 0.55},${ground - 560} L${w * 0.55 + 70},${ground - 460} L${w * 0.55 + 30},${ground - 430} L${w * 0.55},${ground - 470} L${w * 0.55 - 30},${ground - 430} Z`} fill="#fff" />
        {floor(c(P.ground))}{pine(w * 0.1, ground + 10, 1.2)}{pine(w * 0.88, ground + 14, 1.1)}{pine(w * 0.75, ground + 6, 0.8)}{[0].map(bird)}</g>); break;
    case "beach":
      body = (<g><rect x={0} y={ground - 120} width={w} height={120} fill={c("#3E9BD8")} />{floor(c("#F1D79A"), ground)}
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${(i * 330 + frame * 1.5) % (w + 160) - 80},${ground - 70 + i * 22} q40,-14 80,0 t80,0`} stroke="#fff" strokeWidth={5} fill="none" opacity={0.7} />)}
        <g transform={`translate(${w * 0.86},${ground + 30})`}><path d="M0,0 Q20,-200 -10,-330" stroke={c("#8B5A2B")} strokeWidth={22} fill="none" />{[-120, -60, 0, 60, 120].map((a, i) => <path key={i} d={`M-10,-330 q${a},-70 ${a * 1.6},${i % 2 ? 30 : 10}`} stroke={c("#2F8F4A")} strokeWidth={18} fill="none" strokeLinecap="round" />)}</g></g>); break;
    case "farm":
      body = (<g>{hills(c(P.far), ground - 30, 70, 8)}{floor(c("#B9C97A"))}
        {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M0,${ground + 40 + i * 70} L${w},${ground + 20 + i * 62}`} stroke={c("#7FA14A")} strokeWidth={22} opacity={0.7} />)}
        <g transform={`translate(${w * 0.82},${ground + 4})`}><rect x={-100} y={-170} width={200} height={170} fill={c("#C0392B")} stroke={OUT} strokeWidth={3} /><path d="M-120,-168 L0,-250 L120,-168 Z" fill={c("#7B241C")} stroke={OUT} strokeWidth={3} /><rect x={-34} y={-100} width={68} height={100} fill="#F5E6C8" stroke={OUT} strokeWidth={3} /></g>
        <g transform={`translate(${w * 0.12},${ground + 20})`}><rect x={-6} y={-180} width={12} height={180} fill={c("#8B5A2B")} /><line x1={-70} y1={-140} x2={70} y2={-140} stroke={c("#8B5A2B")} strokeWidth={10} /><circle cx={0} cy={-200} r={26} fill={c("#E6C07B")} stroke={OUT} strokeWidth={3} /><path d="M-40,-224 L40,-224 L0,-262 Z" fill={c("#7B5230")} /></g></g>); break;
    case "street":
      body = (<g>{building(w * 0.0, ground, 240, 620, "#E67E22")}{building(w * 0.2, ground, 220, 780, "#5DADE2")}{building(w * 0.4, ground, 260, 520, "#F4D03F", 0.1)}{building(w * 0.62, ground, 230, 700, "#AF7AC5")}{building(w * 0.82, ground, 250, 580, "#48C9B0")}
        {floor(c("#A6ACAF"))}<rect x={0} y={ground + 160} width={w} height={h - ground - 160} fill={c("#566573")} />
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={((i * 300 - frame * 3) % (w + 300) + w + 300) % (w + 300) - 150} y={ground + 280} width={150} height={14} fill="#F5F1E6" />)}
        {[0.12, 0.55, 0.9].map((p, i) => <g key={i} transform={`translate(${w * p},${ground + 20})`}><rect x={-6} y={-260} width={12} height={260} fill={c("#34495E")} /><circle cx={0} cy={-270} r={20} fill={time === "night" ? "#FFE08A" : c("#F7DC6F")} stroke={OUT} strokeWidth={3} /></g>)}</g>); break;
    case "market":
      body = (<g>{building(0, ground, w, 480, "#F0B27A", 0.1)}{floor(c("#C9A27A"))}
        {[0.12, 0.42, 0.72].map((p, i) => <g key={i} transform={`translate(${w * p},${ground + 30})`}>
          <rect x={-120} y={-200} width={240} height={200} fill={c("#8B5A2B")} stroke={OUT} strokeWidth={3} />
          <path d="M-140,-200 L140,-200 L120,-270 L-120,-270 Z" fill={c(["#E74C3C", "#27AE60", "#F1C40F"][i])} stroke={OUT} strokeWidth={3} />
          {[0, 1, 2, 3, 4].map((j) => <circle key={j} cx={-80 + j * 40} cy={-215 + (j % 2) * 6} r={19} fill={c(["#E67E22", "#E74C3C", "#F1C40F", "#2ECC71", "#E67E22"][j])} stroke={OUT} strokeWidth={2.5} />)}</g>)}
        <path d={`M0,150 Q${w / 2},300 ${w},150`} stroke={OUT} strokeWidth={3} fill="none" />{Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${i * (w / 10) - 20},${150 + 90 * Math.sin((i / 10) * Math.PI)} l20,0 l-10,36 z`} fill={["#E74C3C", "#F1C40F", "#2ECC71", "#3498DB"][i % 4]} />)}</g>); break;
    case "school":
      body = (<g>{hills(c(P.far), ground - 40, 60, 2)}{floor(c(P.ground))}
        <g transform={`translate(${w / 2},${ground + 10})`}><rect x={-300} y={-300} width={600} height={300} fill={c("#F5CBA7")} stroke={OUT} strokeWidth={3} /><path d="M-330,-298 L0,-410 L330,-298 Z" fill={c("#C0392B")} stroke={OUT} strokeWidth={3} />
          {[-230, -130, 70, 170].map((x, i) => <rect key={i} x={x} y={-250} width={60} height={70} fill={time === "night" ? "#FFE08A" : c("#AED6F1")} stroke={OUT} strokeWidth={3} />)}<rect x={-40} y={-130} width={80} height={130} fill={c("#6B4A2B")} stroke={OUT} strokeWidth={3} />
          <line x1={0} y1={-410} x2={0} y2={-520} stroke={OUT} strokeWidth={5} /><path d={`M0,-520 l70,${12 + Math.sin(frame * 0.2) * 5} l-70,26 z`} fill="#FF9933" /></g>
        {tree(w * 0.08, ground + 30, 0.9)}{tree(w * 0.93, ground + 30, 0.9)}</g>); break;
    case "temple":
      body = (<g>{hills(c(P.far), ground - 20, 70, 4)}{floor(c("#D7C3A0"))}
        <g transform={`translate(${w / 2},${ground + 10})`}>{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-(300 - i * 50)} y={-60 - i * 54} width={(300 - i * 50) * 2} height={54} fill={c(i % 2 ? "#F5CBA7" : "#E59866")} stroke={OUT} strokeWidth={3} />)}
          <path d="M-70,-330 Q0,-520 70,-330 Z" fill={c("#E67E22")} stroke={OUT} strokeWidth={3} /><line x1={0} y1={-500} x2={0} y2={-560} stroke={OUT} strokeWidth={5} /><path d={`M0,-560 l50,${8 + Math.sin(frame * 0.25) * 4} l-50,18 z`} fill="#E74C3C" /><rect x={-34} y={-130} width={68} height={130} rx={34} fill="#3E2723" stroke={OUT} strokeWidth={3} /></g>
        {[0.15, 0.85].map((p, i) => <g key={i} transform={`translate(${w * p},${ground + 40})`}><rect x={-14} y={-18} width={28} height={18} fill="#B7791F" /><path d={`M0,-20 q-10,-26 0,-44 q10,18 0,44`} fill="#FFB020" opacity={0.7 + 0.3 * Math.sin(frame * 0.3 + i)} /></g>)}</g>); break;
    case "palace":
      body = (<g><rect x={0} y={0} width={w} height={ground} fill="none" />{hills(c(P.far), ground - 10, 40, 7)}{floor(c("#E8D5B0"))}
        <g transform={`translate(${w / 2},${ground + 10})`}><rect x={-380} y={-340} width={760} height={340} fill={c("#F8E7C8")} stroke={OUT} strokeWidth={3} />
          {[-300, -180, -60, 60, 180, 300].map((x, i) => <path key={i} d={`M${x - 36},0 L${x - 36},-150 Q${x},-230 ${x + 36},-150 L${x + 36},0 Z`} fill={c("#8E5A2B")} stroke={OUT} strokeWidth={3} />)}
          {[-250, 0, 250].map((x, i) => <g key={i}><path d={`M${x - 80},-340 Q${x},-540 ${x + 80},-340 Z`} fill={c("#F4D03F")} stroke={OUT} strokeWidth={3} /><line x1={x} y1={-520} x2={x} y2={-580} stroke={OUT} strokeWidth={4} /></g>)}</g>
        <path d={`M${w * 0.4},${h} L${w * 0.47},${ground + 30} L${w * 0.53},${ground + 30} L${w * 0.6},${h} Z`} fill={c("#B03A2E")} /></g>); break;
    case "hospital":
      body = (<g>{hills(c(P.far), ground - 20, 40, 9)}{floor(c("#B8C2CC"))}
        <g transform={`translate(${w / 2},${ground + 10})`}><rect x={-340} y={-420} width={680} height={420} fill={c("#F4F6F7")} stroke={OUT} strokeWidth={3} /><rect x={-48} y={-380} width={96} height={96} rx={12} fill="#E74C3C" /><rect x={-14} y={-364} width={28} height={64} fill="#fff" /><rect x={-32} y={-348} width={64} height={28} fill="#fff" />
          {[-270, -180, 100, 190].flatMap((x) => [-220, -120].map((y) => <rect key={`${x}${y}`} x={x} y={y} width={56} height={56} fill={time === "night" ? "#FFE08A" : c("#AED6F1")} stroke={OUT} strokeWidth={3} />))}<rect x={-50} y={-130} width={100} height={130} fill={c("#85C1E9")} stroke={OUT} strokeWidth={3} /></g></g>); break;
    case "office":
      body = (<g><rect width={w} height={ground} fill={c("#E5E8EC")} />{floor(c("#B0A090"))}
        <g transform={`translate(${w * 0.2},${ground - 480})`}><rect width={w * 0.6} height={320} fill={c("#BFE3F7")} stroke={OUT} strokeWidth={4} />{[0.1, 0.3, 0.5, 0.7, 0.9].map((p, i) => <rect key={i} x={w * 0.6 * p - 30} y={320 - 100 - (i % 3) * 50} width={60} height={100 + (i % 3) * 50} fill={c("#7FB3D5")} />)}</g>
        <g transform={`translate(${w * 0.5},${ground + 30})`}><rect x={-260} y={-130} width={520} height={20} fill={c("#8B5A2B")} stroke={OUT} strokeWidth={3} /><rect x={-240} y={-110} width={20} height={110} fill={c("#6B4A2B")} /><rect x={220} y={-110} width={20} height={110} fill={c("#6B4A2B")} /><rect x={-70} y={-240} width={140} height={100} rx={8} fill="#2C3E50" stroke={OUT} strokeWidth={3} /></g>
        <circle cx={w * 0.9} cy={ground - 560} r={50} fill="#fff" stroke={OUT} strokeWidth={4} /><line x1={w * 0.9} y1={ground - 560} x2={w * 0.9} y2={ground - 596} stroke={OUT} strokeWidth={4} /><line x1={w * 0.9} y1={ground - 560} x2={w * 0.9 + 24} y2={ground - 548} stroke={OUT} strokeWidth={4} /></g>); break;
    case "home":
      body = (<g><rect width={w} height={ground} fill={c(P.wall)} />{floor(c("#B07D4F"))}<rect x={0} y={ground - 22} width={w} height={22} fill={c("#8B5A2B")} />
        <g transform={`translate(${w * 0.18},${ground - 560})`}><rect width={260} height={300} fill={c("#BFE3F7")} stroke={OUT} strokeWidth={5} /><line x1={130} y1={0} x2={130} y2={300} stroke={OUT} strokeWidth={4} /><line x1={0} y1={150} x2={260} y2={150} stroke={OUT} strokeWidth={4} /></g>
        <g transform={`translate(${w * 0.68},${ground + 20})`}><rect x={-200} y={-170} width={400} height={120} rx={26} fill={c("#C0392B")} stroke={OUT} strokeWidth={3} /><rect x={-230} y={-210} width={70} height={170} rx={24} fill={c("#A93226")} stroke={OUT} strokeWidth={3} /><rect x={160} y={-210} width={70} height={170} rx={24} fill={c("#A93226")} stroke={OUT} strokeWidth={3} /></g>
        <rect x={w * 0.5 - 110} y={ground - 520} width={150} height={110} fill={c("#F5CBA7")} stroke={OUT} strokeWidth={4} /></g>); break;
    case "room_night":
      body = (<g><rect width={w} height={ground} fill="#1B2440" />{floor("#2A2F4F")}
        <g transform={`translate(${w * 0.62},${ground - 600})`}><rect width={280} height={320} fill="#0B1533" stroke="#8892B0" strokeWidth={6} /><circle cx={190} cy={90} r={48} fill="#F7F3D0" />{[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={30 + i * 44} cy={40 + (i % 3) * 70} r={3} fill="#fff" opacity={star(i)} />)}</g>
        <g transform={`translate(${w * 0.22},${ground + 20})`}><rect x={-210} y={-150} width={420} height={130} rx={14} fill="#34495E" stroke={OUT} strokeWidth={3} /><rect x={-210} y={-230} width={90} height={90} rx={14} fill="#ECF0F1" /><rect x={-120} y={-170} width={330} height={40} rx={14} fill="#5DADE2" /></g>
        <ellipse cx={w * 0.45} cy={ground - 60} rx={300} ry={160} fill="#F7DC6F" opacity={0.05 + 0.02 * Math.sin(frame * 0.05)} /></g>); break;
    case "bank":
      body = (<g><rect width={w} height={ground} fill={c("#EAF2F8")} />{floor(c("#C8B79A"))}<rect x={0} y={ground - 20} width={w} height={20} fill={c("#8B7355")} />
        <g transform={`translate(${w / 2},${ground - 700})`}><rect x={-260} y={-20} width={520} height={110} rx={14} fill={c("#1F618D")} stroke={OUT} strokeWidth={4} /><text textAnchor="middle" y={62} fontSize={78} fontWeight={900} fill="#fff" fontFamily={STORY_FONT}>BANK</text></g>
        {[0.12, 0.88].map((p, i) => <g key={i} transform={`translate(${w * p},${ground})`}><rect x={-34} y={-520} width={68} height={520} fill={c("#F5F1E6")} stroke={OUT} strokeWidth={3} /><rect x={-48} y={-540} width={96} height={26} fill={c("#F5F1E6")} stroke={OUT} strokeWidth={3} /></g>)}
        <g transform={`translate(${w * 0.5},${ground + 40})`}><rect x={-330} y={-150} width={660} height={150} rx={10} fill={c("#8E5A2B")} stroke={OUT} strokeWidth={4} /><rect x={-330} y={-250} width={660} height={100} fill="#D6EAF8" opacity={0.6} stroke={OUT} strokeWidth={3} />
          {[0, 1, 2].map((i) => <circle key={i} cx={-120 + i * 120} cy={-176 + Math.sin(frame * 0.1 + i) * 4} r={22} fill="#F4D03F" stroke={OUT} strokeWidth={3} />)}</g></g>); break;
    case "stock":
      body = (<g><rect width={w} height={ground} fill="#0E1726" />{floor("#1B2638")}
        {[0, 1, 2].flatMap((r) => [0, 1].map((cc) => ({ r, cc }))).map(({ r, cc }, i) => {
          const x = w * (0.06 + cc * 0.48), y = ground - 900 + r * 270;
          const pts = Array.from({ length: 14 }, (_, k) => `${k * 30},${120 - 60 * Math.sin(k * 0.7 + i + frame * 0.03) - k * (i % 2 ? -3 : 3)}`).join(" ");
          return (<g key={i} transform={`translate(${x},${y})`}><rect width={w * 0.42} height={230} rx={10} fill="#0B1220" stroke="#2E4057" strokeWidth={3} />
            <g transform="translate(30,20)"><polyline points={pts} fill="none" stroke={i % 2 ? "#E74C3C" : "#2ECC71"} strokeWidth={6} strokeLinejoin="round" /></g>
            <text x={24} y={216} fontSize={28} fontWeight={800} fill={i % 2 ? "#E74C3C" : "#2ECC71"} fontFamily={STORY_FONT}>{i % 2 ? "▼" : "▲"} {["SENSEX", "NIFTY", "BANKNIFTY", "GOLD", "USD/INR", "CRUDE"][i]}</text></g>);
        })}</g>); break;
    case "newsroom":
      body = (<g><defs><linearGradient id="nr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12264A" /><stop offset="1" stopColor="#0A1630" /></linearGradient></defs><rect width={w} height={ground} fill="url(#nr)" />{floor("#0B1226")}
        <g transform={`translate(${w * 0.1},${ground - 980})`}><rect width={w * 0.8} height={560} rx={18} fill="#0A1B3F" stroke="#3B6FD4" strokeWidth={5} />
          {Array.from({ length: 36 }, (_, i) => <circle key={i} cx={60 + (i % 9) * ((w * 0.8 - 120) / 8)} cy={70 + Math.floor(i / 9) * 120} r={7 + (i % 3) * 2} fill="#3B6FD4" opacity={0.35 + 0.5 * Math.abs(Math.sin(frame * 0.04 + i))} />)}
          <text x={w * 0.4} y={300} textAnchor="middle" fontSize={120} fontWeight={900} fill="#fff" opacity={0.9} fontFamily={STORY_FONT}>NEWS</text></g>
        <g transform={`translate(${w * 0.5},${ground + 50})`}><rect x={-420} y={-180} width={840} height={180} rx={14} fill="#1B2B50" stroke="#3B6FD4" strokeWidth={4} /><rect x={-420} y={-196} width={840} height={20} fill="#C0392B" /></g></g>); break;
    case "studio":
      body = (<g><defs><radialGradient id="sg" cx="50%" cy="40%" r="70%"><stop offset="0" stopColor="#3A5BA0" /><stop offset="1" stopColor="#101A38" /></radialGradient></defs><rect width={w} height={ground} fill="url(#sg)" />{floor("#0D1530")}
        <path d={`M${w * 0.3},0 L${w * 0.7},0 L${w * 0.95},${ground} L${w * 0.05},${ground} Z`} fill="#fff" opacity={0.05 + 0.02 * Math.sin(frame * 0.05)} /></g>); break;
    case "govt":
      body = (<g>{hills(c(P.far), ground - 20, 40, 11)}{floor(c("#CFC3A8"))}
        <g transform={`translate(${w / 2},${ground + 12})`}><rect x={-420} y={-300} width={840} height={300} fill={c("#F5E6C8")} stroke={OUT} strokeWidth={3} />
          {[-340, -250, -160, -70, 20, 110, 200, 290].map((x, i) => <rect key={i} x={x} y={-260} width={30} height={240} fill={c("#FFF8E7")} stroke={OUT} strokeWidth={2.5} />)}
          <path d="M-140,-300 Q0,-560 140,-300 Z" fill={c("#E5B96B")} stroke={OUT} strokeWidth={3} /><line x1={0} y1={-520} x2={0} y2={-620} stroke={OUT} strokeWidth={5} /><path d={`M0,-620 l70,${10 + Math.sin(frame * 0.25) * 5} l-70,26 z`} fill="#FF9933" /><path d={`M0,-594 l70,${10 + Math.sin(frame * 0.25) * 5} l-70,-12 z`} fill="#fff" opacity={0.0} />
          {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={-420 + i * 10} y={-i * 12} width={840 - i * 20} height={12} fill={c("#D7C3A0")} stroke={OUT} strokeWidth={2} />)}</g></g>); break;
  }
  return <g>{interior ? null : sky}{body}</g>;
};
