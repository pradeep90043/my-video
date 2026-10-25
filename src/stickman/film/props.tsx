/**
 * The furniture and objects a director-staged shot is built from. Every prop's origin is the MIDDLE OF ITS BOTTOM EDGE, so a prop
 * placed at y = a surface's top stands on it; each declares its size, the surface on top of it (`top`, things can be put there),
 * its seat height (people sit there), and the point a hand holds it by (`grip`). Sizes are in the units of a standing person who is
 * 560 tall at scale 1. Drawings face right; `flip` mirrors them.
 */
import React from "react";
import type { FilmLayer } from "./schema";
import { MARKER_FONT, UI_FONT } from "./fonts";

type PropLayer = Extract<FilmLayer, { t: "prop" }>;
export type PropKind = PropLayer["kind"];

export interface PropSpec {
  w: number; h: number;
  /** where it lives: on the floor, on a surface, or hung on the wall */
  mount: "floor" | "surface" | "wall";
  /** a surface others can be put on: its height above the origin and its usable width */
  top?: { y: number; w: number };
  /** a seat: its height above the floor, and how far the seat's middle is from the origin (+x = the way it faces) */
  seat?: { y: number; dx: number; lie?: boolean };
  /** the held point (local, origin = bottom middle) */
  grip?: [number, number];
  /** big enough that a person stands beside it, not in front */
  big?: boolean;
}

export const PROPS: Record<PropKind, PropSpec> = {
  desk: { w: 560, h: 236, mount: "floor", top: { y: 236, w: 540 }, big: true },
  table: { w: 600, h: 232, mount: "floor", top: { y: 232, w: 580 }, big: true },
  chair: { w: 180, h: 450, mount: "floor", seat: { y: 200, dx: 10 } },
  stool: { w: 150, h: 200, mount: "floor", seat: { y: 200, dx: 0 }, top: { y: 200, w: 140 } },
  nightstand: { w: 270, h: 220, mount: "floor", top: { y: 220, w: 260 } },
  bed: { w: 780, h: 320, mount: "floor", top: { y: 190, w: 700 }, seat: { y: 190, dx: 120, lie: true }, big: true },
  sofa: { w: 640, h: 300, mount: "floor", seat: { y: 200, dx: 40 }, big: true },
  bench: { w: 540, h: 200, mount: "floor", seat: { y: 200, dx: 0 }, top: { y: 200, w: 500 }, big: true },
  bookcase: { w: 380, h: 640, mount: "floor", top: { y: 640, w: 360 }, big: true },
  wardrobe: { w: 400, h: 680, mount: "floor", big: true },
  fridge: { w: 300, h: 620, mount: "floor", top: { y: 620, w: 280 }, big: true },
  "kitchen-counter": { w: 760, h: 290, mount: "floor", top: { y: 290, w: 740 }, big: true },
  stove: { w: 300, h: 290, mount: "floor", top: { y: 290, w: 280 }, big: true },
  "tv-stand": { w: 520, h: 160, mount: "floor", top: { y: 160, w: 500 }, big: true },
  tv: { w: 420, h: 260, mount: "surface", grip: [0, -130] },
  plant: { w: 180, h: 340, mount: "floor" },
  "lamp-floor": { w: 140, h: 560, mount: "floor" },
  door: { w: 280, h: 620, mount: "floor", big: true },
  "trash-bin": { w: 120, h: 150, mount: "floor", grip: [0, -150] },
  whiteboard: { w: 720, h: 420, mount: "wall" },
  window: { w: 500, h: 420, mount: "wall" },
  poster: { w: 300, h: 400, mount: "wall" },
  clock: { w: 130, h: 130, mount: "wall" },
  "wall-shelf": { w: 420, h: 30, mount: "wall", top: { y: 30, w: 400 } },
  picture: { w: 240, h: 180, mount: "wall" },
  mirror: { w: 200, h: 320, mount: "wall" },
  laptop: { w: 220, h: 140, mount: "surface", grip: [-60, -8] },
  book: { w: 140, h: 26, mount: "surface", grip: [0, -13] },
  "book-open": { w: 200, h: 22, mount: "surface", grip: [-60, -12] },
  "book-stack": { w: 150, h: 96, mount: "surface", grip: [0, -48] },
  "books-box": { w: 240, h: 120, mount: "surface", grip: [0, -60] },
  notebook: { w: 130, h: 14, mount: "surface", grip: [0, -7] },
  phone: { w: 40, h: 76, mount: "surface", grip: [0, -30] },
  mug: { w: 70, h: 80, mount: "surface", grip: [30, -40] },
  bottle: { w: 50, h: 150, mount: "surface", grip: [0, -70] },
  glass: { w: 50, h: 80, mount: "surface", grip: [0, -40] },
  plate: { w: 160, h: 16, mount: "surface", grip: [60, -8] },
  bowl: { w: 130, h: 56, mount: "surface", grip: [0, -28] },
  "lamp-desk": { w: 150, h: 230, mount: "surface" },
  bag: { w: 190, h: 210, mount: "surface", grip: [0, -200] },
  ball: { w: 80, h: 80, mount: "surface", grip: [0, -40] },
  "alarm-clock": { w: 90, h: 96, mount: "surface", grip: [0, -48] },
  pillow: { w: 170, h: 60, mount: "surface" },
  pen: { w: 90, h: 10, mount: "surface", grip: [0, -5] },
  paper: { w: 140, h: 6, mount: "surface", grip: [0, -3] },
  box: { w: 200, h: 150, mount: "surface", grip: [0, -75] },
  gift: { w: 140, h: 130, mount: "surface", grip: [0, -65] },
  cake: { w: 200, h: 130, mount: "surface" },
  dumbbell: { w: 130, h: 44, mount: "surface", grip: [0, -22] },
  guitar: { w: 140, h: 380, mount: "floor", grip: [0, -300] },
  headphones: { w: 110, h: 100, mount: "surface", grip: [0, -90] },
  trophy: { w: 100, h: 150, mount: "surface", grip: [0, -60] },
  "flower-pot": { w: 100, h: 140, mount: "surface", grip: [0, -40] },
  food: { w: 150, h: 50, mount: "surface", grip: [60, -10] },
};

const SH = (w: number, o = 0.28) => <ellipse cx={0} cy={0} rx={w * 0.56} ry={Math.max(6, w * 0.05)} fill="#000" opacity={o} filter="url(#fl-soft2)" />;
const WOOD = "#9a6b47", WOOD_D = "#6e4a30", METAL = "#5d6670", WHITE = "#eef0f2";

/** The drawing, in local space (origin = bottom middle, y up is negative). */
export const PropArt: React.FC<{ layer: PropLayer; frame: number; grade?: string }> = ({ layer, frame, grade }) => {
  const k = layer.kind, c = layer.color, on = layer.on, night = grade === "night" || grade === "rain";
  const sp = PROPS[k];
  const body = (() => {
    switch (k) {
      case "desk":
      case "table": {
        const w = sp.w, h = sp.h, top = c ?? (k === "desk" ? WOOD : "#b07d55");
        return <g>
          <rect x={-w / 2} y={-h} width={w} height={26} rx={4} fill={top} />
          <rect x={-w / 2} y={-h} width={w} height={5} fill="#fff" opacity={0.18} />
          <rect x={-w / 2 + 20} y={-h + 26} width={22} height={h - 26} fill={WOOD_D} />
          <rect x={w / 2 - 42} y={-h + 26} width={22} height={h - 26} fill={WOOD_D} />
          {k === "desk" && <g><rect x={w / 2 - 210} y={-h + 26} width={170} height={150} fill={top} opacity={0.92} /><rect x={w / 2 - 210} y={-h + 100} width={170} height={4} fill={WOOD_D} /><rect x={w / 2 - 140} y={-h + 56} width={30} height={8} rx={4} fill={WOOD_D} /><rect x={w / 2 - 140} y={-h + 128} width={30} height={8} rx={4} fill={WOOD_D} /></g>}
          <rect x={-w / 2} y={-h + 26} width={w} height={14} fill="#000" opacity={0.2} />
        </g>;
      }
      case "chair":
        return <g fill={c ?? "#3f4a56"}>
          <rect x={-80} y={-450} width={26} height={450} rx={8} />
          <rect x={-82} y={-450} width={40} height={210} rx={14} />
          <rect x={-80} y={-210} width={170} height={22} rx={8} />
          <rect x={64} y={-192} width={20} height={192} rx={6} />
          <rect x={-80} y={-210} width={170} height={6} fill="#fff" opacity={0.15} />
        </g>;
      case "stool":
        return <g fill={c ?? WOOD}><rect x={-75} y={-200} width={150} height={22} rx={8} /><rect x={-60} y={-182} width={16} height={182} fill={WOOD_D} /><rect x={44} y={-182} width={16} height={182} fill={WOOD_D} /><rect x={-56} y={-70} width={112} height={10} fill={WOOD_D} /></g>;
      case "nightstand":
        return <g><rect x={-135} y={-220} width={270} height={20} rx={4} fill={c ?? WOOD} /><rect x={-125} y={-200} width={250} height={190} fill={c ?? WOOD} opacity={0.9} /><rect x={-115} y={-180} width={230} height={70} rx={4} fill={WOOD_D} opacity={0.5} /><rect x={-20} y={-150} width={40} height={8} rx={4} fill={WOOD_D} /><rect x={-120} y={-10} width={20} height={10} fill={WOOD_D} /><rect x={100} y={-10} width={20} height={10} fill={WOOD_D} /></g>;
      case "bed":
        return <g>
          <rect x={-390} y={-320} width={40} height={320} rx={10} fill={WOOD_D} />
          <rect x={350} y={-210} width={40} height={210} rx={10} fill={WOOD_D} />
          <rect x={-360} y={-130} width={720} height={70} fill={WOOD} />
          <rect x={-356} y={-190} width={712} height={66} rx={20} fill="#eceae4" />
          <path d={`M-150,-196 L356,-196 L356,-120 Q100,-110 -150,-124 Z`} fill={c ?? "#5b7fa6"} />
          <path d="M-150,-196 L356,-196 L356,-188 L-150,-188 Z" fill="#fff" opacity={0.2} />
          <rect x={-340} y={-60} width={30} height={60} fill={WOOD_D} /><rect x={310} y={-60} width={30} height={60} fill={WOOD_D} />
        </g>;
      case "sofa":
        return <g fill={c ?? "#7c6a8e"}>
          <rect x={-320} y={-300} width={640} height={150} rx={40} />
          <rect x={-320} y={-200} width={640} height={152} rx={24} />
          <rect x={-340} y={-230} width={70} height={190} rx={30} /><rect x={270} y={-230} width={70} height={190} rx={30} />
          <rect x={-300} y={-200} width={600} height={8} fill="#fff" opacity={0.15} />
          <rect x={-290} y={-48} width={24} height={48} fill={WOOD_D} /><rect x={266} y={-48} width={24} height={48} fill={WOOD_D} />
        </g>;
      case "bench":
        return <g><rect x={-270} y={-200} width={540} height={26} rx={6} fill={c ?? "#8a5a3a"} /><rect x={-250} y={-174} width={22} height={174} fill="#6b4328" /><rect x={228} y={-174} width={22} height={174} fill="#6b4328" /></g>;
      case "bookcase": {
        const spines = ["#4f6fa3", "#6fa58f", "#c8b46c", "#b46a6a", "#8a7ab0", "#d9dbdc", "#5b8c9b", "#c98f5a"];
        return <g>
          <rect x={-190} y={-640} width={380} height={640} fill={c ?? WOOD_D} />
          {[0, 1, 2, 3].map((r) => <g key={r}>
            <rect x={-172} y={-622 + r * 155} width={344} height={137} fill="#3a281b" />
            {Array.from({ length: 9 }).map((_, i) => { const bh = 90 + ((i * 37 + r * 11) % 40); return <rect key={i} x={-166 + i * 37} y={-622 + r * 155 + 137 - bh} width={32} height={bh} fill={spines[(i + r * 3) % spines.length]} />; })}
          </g>)}
        </g>;
      }
      case "wardrobe":
        return <g><rect x={-200} y={-680} width={400} height={680} rx={6} fill={c ?? "#b08b66"} /><line x1={0} y1={-670} x2={0} y2={-10} stroke={WOOD_D} strokeWidth={4} /><rect x={-26} y={-380} width={10} height={70} rx={5} fill={METAL} /><rect x={16} y={-380} width={10} height={70} rx={5} fill={METAL} /></g>;
      case "fridge":
        return <g><rect x={-150} y={-620} width={300} height={620} rx={22} fill={c ?? "#e4e8ec"} /><line x1={-150} y1={-400} x2={150} y2={-400} stroke="#b6bdc4" strokeWidth={5} /><rect x={110} y={-560} width={12} height={110} rx={6} fill="#9aa3ab" /><rect x={110} y={-370} width={12} height={130} rx={6} fill="#9aa3ab" /></g>;
      case "kitchen-counter":
        return <g><rect x={-380} y={-290} width={760} height={30} fill={c ?? "#d9d6cf"} /><rect x={-372} y={-260} width={744} height={260} fill="#8f9aa5" />{[0, 1, 2, 3].map((i) => <g key={i}><rect x={-360 + i * 184} y={-246} width={172} height={230} rx={6} fill="#a3adb7" /><rect x={-290 + i * 184} y={-226} width={36} height={8} rx={4} fill="#5d6670" /></g>)}</g>;
      case "stove":
        return <g><rect x={-150} y={-290} width={300} height={290} rx={6} fill={c ?? "#cfd4d9"} /><rect x={-150} y={-290} width={300} height={22} fill="#3a3f45" /><rect x={-120} y={-230} width={240} height={160} rx={8} fill="#2a2f35" />{on && <ellipse cx={0} cy={-292} rx={70} ry={8} fill="#ff8a3a" opacity={0.7} />}</g>;
      case "tv-stand":
        return <g><rect x={-260} y={-160} width={520} height={160} rx={8} fill={c ?? "#4a3f38"} /><rect x={-240} y={-140} width={230} height={120} rx={6} fill="#3a312b" /><rect x={10} y={-140} width={230} height={120} rx={6} fill="#3a312b" /></g>;
      case "tv":
        return <g><rect x={-20} y={-30} width={40} height={30} fill="#222" /><rect x={-80} y={-8} width={160} height={8} rx={4} fill="#222" /><rect x={-210} y={-260} width={420} height={232} rx={10} fill="#111" /><rect x={-198} y={-248} width={396} height={208} rx={4} fill={on ? "#6aa0d8" : "#1b1f26"} />{on && <rect x={-198} y={-248} width={396} height={208} fill="url(#fl-cool)" opacity={0.8} />}</g>;
      case "plant":
        return <g><path d="M-60,-120 L60,-120 L48,0 L-48,0 Z" fill={c ?? "#c0693e"} />{[-50, -20, 10, 40, 60, -70].map((a, i) => <ellipse key={i} cx={Math.sin(a / 30) * 40} cy={-200 - (i % 3) * 40} rx={26} ry={80} fill={i % 2 ? "#4f8a49" : "#5f9b55"} transform={`rotate(${a + Math.sin((frame + i * 20) / 50) * 3} 0 -120)`} />)}</g>;
      case "lamp-floor":
        return <g><ellipse cx={0} cy={-4} rx={60} ry={10} fill={METAL} /><rect x={-6} y={-470} width={12} height={466} fill={METAL} /><path d="M-70,-460 L70,-460 L46,-560 L-46,-560 Z" fill={c ?? "#e9dcc0"} />{on && <ellipse cx={0} cy={-380} rx={200} ry={220} fill="url(#fl-warm)" />}</g>;
      case "door":
        return <g><rect x={-140} y={-620} width={280} height={620} fill="#d9d4cc" /><rect x={-120} y={-600} width={240} height={600} fill={on ? "#20262d" : c ?? "#8a6646"} />{!on && <><rect x={-96} y={-570} width={192} height={230} rx={6} fill="#000" opacity={0.12} /><rect x={-96} y={-300} width={192} height={260} rx={6} fill="#000" opacity={0.12} /><circle cx={84} cy={-300} r={12} fill="#d8c27a" /></>}</g>;
      case "trash-bin":
        return <g><path d="M-60,-150 L60,-150 L50,0 L-50,0 Z" fill={c ?? "#6f7b86"} /><rect x={-64} y={-156} width={128} height={12} rx={4} fill="#4c565f" /></g>;
      case "whiteboard":
        return <g><rect x={-360} y={-420} width={720} height={420} rx={6} fill="#c3c8cd" /><rect x={-346} y={-406} width={692} height={380} fill="#fbfcfc" />{layer.label && <text x={0} y={-210} textAnchor="middle" fontFamily={MARKER_FONT} fontSize={Math.min(90, 1100 / Math.max(6, layer.label.length))} fill="#2a5db0">{layer.label}</text>}<rect x={-200} y={-20} width={400} height={18} rx={4} fill="#9aa1a8" /></g>;
      case "window": {
        const sky = night ? "#0f1626" : c ?? "#bcd9ef";
        return <g>
          <rect x={-250} y={-420} width={500} height={420} fill={sky} />
          {night ? <><circle cx={140} cy={-330} r={30} fill="#f3efd8" />{Array.from({ length: 16 }).map((_, i) => <rect key={i} x={-230 + ((i * 57) % 460)} y={-130 + ((i * 31) % 90)} width={14} height={18} fill="#f2d27a" opacity={0.6} />)}</>
            : <><ellipse cx={120} cy={-330} rx={70} ry={34} fill="#fff" opacity={0.8} /><path d="M-250,-120 L-150,-170 L-40,-120 L60,-180 L170,-120 L250,-150 L250,0 L-250,0 Z" fill="#9bb5a4" /></>}
          <rect x={-250} y={-420} width={500} height={420} fill="none" stroke="#eef0f1" strokeWidth={18} />
          <line x1={0} y1={-420} x2={0} y2={0} stroke="#eef0f1" strokeWidth={12} /><line x1={-250} y1={-210} x2={250} y2={-210} stroke="#eef0f1" strokeWidth={10} />
          <rect x={-280} y={-6} width={560} height={22} rx={4} fill="#e2e5e8" />
        </g>;
      }
      case "poster":
        return <g><rect x={-150} y={-400} width={300} height={400} fill={c ?? "#efe9dc"} /><rect x={-26} y={-412} width={52} height={22} fill="#d8cfa8" opacity={0.85} />{layer.label && <text x={0} y={-180} textAnchor="middle" fontFamily={MARKER_FONT} fontSize={Math.min(120, 520 / Math.max(2, layer.label.length))} fill="#d9453d">{layer.label}</text>}</g>;
      case "clock": {
        const m = (frame * 6) % 360, hr = (frame * 0.5 + 120) % 360;
        return <g transform="translate(0,-65)"><circle r={65} fill="#f6f6f2" stroke={c ?? "#333"} strokeWidth={8} /><line x1={0} y1={0} x2={0} y2={-48} stroke="#222" strokeWidth={5} transform={`rotate(${m})`} strokeLinecap="round" /><line x1={0} y1={0} x2={0} y2={-30} stroke="#222" strokeWidth={8} transform={`rotate(${hr})`} strokeLinecap="round" /></g>;
      }
      case "wall-shelf":
        return <g><rect x={-210} y={-30} width={420} height={22} fill={c ?? WOOD} /><path d="M-170,-8 L-170,30 L-140,-8 Z M170,-8 L170,30 L140,-8 Z" fill={WOOD_D} /></g>;
      case "picture":
        return <g><rect x={-120} y={-180} width={240} height={180} fill={c ?? "#3a2f2a"} /><rect x={-104} y={-164} width={208} height={148} fill="#a9c3d6" /><path d="M-104,-16 L-40,-90 L10,-50 L60,-110 L104,-60 L104,-16 Z" fill="#6a8f6a" /></g>;
      case "mirror":
        return <g><ellipse cx={0} cy={-160} rx={100} ry={160} fill={c ?? "#c9b48a"} /><ellipse cx={0} cy={-160} rx={84} ry={144} fill="#cfe0ea" /><path d="M-40,-260 L20,-80" stroke="#fff" strokeWidth={10} opacity={0.5} /></g>;
      case "laptop":
        return <g><rect x={-110} y={-14} width={220} height={14} rx={4} fill={c ?? "#b9c0c7"} /><path d="M-96,-14 L-78,-140 L88,-140 L96,-14 Z" fill="#2a2f35" /><path d="M-86,-22 L-71,-132 L81,-132 L88,-22 Z" fill={on ? "#cfe3f7" : "#11161c"} />{on && <ellipse cx={0} cy={-80} rx={160} ry={120} fill="url(#fl-cool)" />}</g>;
      case "book":
        return <g><rect x={-70} y={-26} width={140} height={26} rx={3} fill={c ?? "#4f6fa3"} /><rect x={-64} y={-8} width={128} height={6} fill="#f4f1e6" /></g>;
      case "book-open":
        return <g><path d="M0,-6 Q-50,-24 -100,-14 L-100,0 Q-50,-10 0,0 Z" fill="#f4f0e2" stroke="#9a9484" strokeWidth={2} /><path d="M0,-6 Q50,-24 100,-14 L100,0 Q50,-10 0,0 Z" fill="#faf6ea" stroke="#9a9484" strokeWidth={2} /><rect x={-102} y={-4} width={204} height={6} rx={2} fill={c ?? "#4f6fa3"} /></g>;
      case "book-stack":
        return <g>{["#4f6fa3", "#b46a6a", "#6fa58f", "#c8b46c"].map((col, i) => <rect key={i} x={-70 + (i % 2) * 8} y={-24 * (i + 1)} width={140 - (i % 3) * 10} height={24} rx={3} fill={col} />)}</g>;
      case "books-box":
        return <g><rect x={-120} y={-120} width={240} height={120} rx={4} fill={c ?? "#5f7184"} /><rect x={-124} y={-132} width={248} height={22} rx={4} fill="#7c8ea1" />{layer.label && <text y={-50} textAnchor="middle" fontFamily={UI_FONT} fontSize={18} fontWeight={800} fill="#e9eef3">{layer.label}</text>}</g>;
      case "notebook":
        return <g><rect x={-65} y={-14} width={130} height={14} rx={2} fill={c ?? "#d9453d"} /><rect x={-60} y={-4} width={120} height={3} fill="#fff" /></g>;
      case "phone":
        return <g><rect x={-20} y={-76} width={40} height={76} rx={8} fill="#0d1117" /><rect x={-16} y={-71} width={32} height={64} rx={5} fill={on ? "#cfe3f7" : "#1d2733"} />{on && <ellipse cx={0} cy={-40} rx={60} ry={60} fill="url(#fl-cool)" />}</g>;
      case "mug":
        return <g><rect x={-32} y={-80} width={64} height={80} rx={8} fill={c ?? "#e7e2d6"} /><path d="M32,-62 Q60,-58 32,-24" fill="none" stroke={c ?? "#e7e2d6"} strokeWidth={9} />{on && [0, 1].map((i) => <path key={i} d={`M${-8 + i * 16},-92 q10,-20 0,-40 q-10,-20 0,-40`} stroke="#fff" strokeWidth={4} fill="none" opacity={0.25 + 0.15 * Math.sin(frame / 8 + i)} />)}</g>;
      case "bottle":
        return <g><rect x={-25} y={-110} width={50} height={110} rx={10} fill={c ?? "#6fb0d8"} opacity={0.85} /><rect x={-11} y={-150} width={22} height={44} rx={6} fill={c ?? "#6fb0d8"} opacity={0.85} /><rect x={-13} y={-158} width={26} height={12} rx={3} fill="#2c4a63" /></g>;
      case "glass":
        return <g><path d="M-25,-80 L25,-80 L20,0 L-20,0 Z" fill="#d6ecf7" opacity={0.6} stroke="#fff" strokeWidth={2} /><path d="M-22,-46 L22,-46 L20,0 L-20,0 Z" fill={c ?? "#e8a26b"} opacity={0.8} /></g>;
      case "plate":
        return <g><ellipse cx={0} cy={-8} rx={80} ry={10} fill={c ?? WHITE} /><ellipse cx={0} cy={-10} rx={56} ry={6} fill="#d9dde1" /></g>;
      case "bowl":
        return <g><path d="M-65,-56 Q0,30 65,-56 Z" fill={c ?? "#e9e5da"} /><ellipse cx={0} cy={-56} rx={65} ry={10} fill="#c9a26a" /></g>;
      case "lamp-desk":
        return <g><ellipse cx={-30} cy={-6} rx={50} ry={10} fill={METAL} /><line x1={-30} y1={-6} x2={0} y2={-150} stroke={METAL} strokeWidth={10} /><line x1={0} y1={-150} x2={60} y2={-200} stroke={METAL} strokeWidth={10} /><path d="M20,-200 L100,-230 L110,-170 Z" fill={c ?? "#e9dcc0"} />{on && <ellipse cx={90} cy={-80} rx={240} ry={170} fill="url(#fl-warm)" />}</g>;
      case "bag":
        return <g><path d="M-90,-150 L90,-150 L95,0 L-95,0 Z" fill={c ?? "#b99063"} /><path d="M-45,-150 Q-45,-210 0,-210 Q45,-210 45,-150" fill="none" stroke="#7b5d3d" strokeWidth={10} /></g>;
      case "ball":
        return <g><circle cx={0} cy={-40} r={40} fill={c ?? "#e2683c"} /><path d="M-40,-40 Q0,-20 40,-40 M0,-80 Q-18,-40 0,0" stroke="#000" strokeOpacity={0.35} strokeWidth={4} fill="none" /></g>;
      case "alarm-clock": {
        const sh = on ? Math.sin(frame * 2.2) * 4 : 0;
        return <g transform={`rotate(${sh} 0 -40)`}><circle cx={0} cy={-46} r={42} fill={c ?? "#d9453d"} /><circle cx={0} cy={-46} r={32} fill="#f6f6f2" /><line x1={0} y1={-46} x2={0} y2={-70} stroke="#222" strokeWidth={4} /><line x1={0} y1={-46} x2={16} y2={-46} stroke="#222" strokeWidth={4} /><circle cx={-30} cy={-86} r={12} fill={c ?? "#d9453d"} /><circle cx={30} cy={-86} r={12} fill={c ?? "#d9453d"} /><path d="M-30,-6 L-38,4 M30,-6 L38,4" stroke="#222" strokeWidth={6} /></g>;
      }
      case "pillow":
        return <rect x={-85} y={-60} width={170} height={60} rx={28} fill={c ?? "#f2f0ea"} />;
      case "pen":
        return <g><rect x={-45} y={-10} width={80} height={10} rx={5} fill={c ?? "#1d1d22"} /><path d="M35,-10 L47,-5 L35,0 Z" fill="#d9453d" /></g>;
      case "paper":
        return <rect x={-70} y={-6} width={140} height={6} fill="#f6f6f2" />;
      case "box":
        return <g><rect x={-100} y={-150} width={200} height={150} rx={4} fill={c ?? "#c49a6c"} /><rect x={-100} y={-150} width={200} height={20} fill="#000" opacity={0.08} /><rect x={-14} y={-150} width={28} height={150} fill="#e7d3b0" opacity={0.6} /></g>;
      case "gift":
        return <g><rect x={-70} y={-110} width={140} height={110} rx={4} fill={c ?? "#d9453d"} /><rect x={-76} y={-130} width={152} height={26} rx={4} fill={c ?? "#e05a52"} /><rect x={-10} y={-130} width={20} height={130} fill="#f2d27a" /><path d="M0,-130 Q-40,-170 -30,-130 M0,-130 Q40,-170 30,-130" stroke="#f2d27a" strokeWidth={8} fill="none" /></g>;
      case "cake":
        return <g><rect x={-100} y={-90} width={200} height={90} rx={10} fill={c ?? "#f2c6d0"} /><rect x={-100} y={-90} width={200} height={20} rx={10} fill="#fff" />{[-50, 0, 50].map((x) => <g key={x}><rect x={x - 5} y={-128} width={10} height={38} fill="#8ab8e0" /><ellipse cx={x} cy={-136} rx={6} ry={10} fill="#ffcf5a" opacity={0.8 + 0.2 * Math.sin(frame / 3 + x)} /></g>)}</g>;
      case "dumbbell":
        return <g><rect x={-45} y={-26} width={90} height={10} fill={METAL} /><rect x={-65} y={-44} width={26} height={44} rx={6} fill="#333" /><rect x={39} y={-44} width={26} height={44} rx={6} fill="#333" /></g>;
      case "guitar":
        return <g><ellipse cx={0} cy={-80} rx={70} ry={80} fill={c ?? "#c47a3a"} /><ellipse cx={0} cy={-170} rx={55} ry={60} fill={c ?? "#c47a3a"} /><circle cx={0} cy={-110} r={22} fill="#3a281b" /><rect x={-10} y={-380} width={20} height={230} fill="#3a281b" /></g>;
      case "headphones":
        return <g><path d="M-45,-40 Q-45,-100 0,-100 Q45,-100 45,-40" fill="none" stroke={c ?? "#222"} strokeWidth={10} /><rect x={-58} y={-56} width={28} height={56} rx={12} fill={c ?? "#222"} /><rect x={30} y={-56} width={28} height={56} rx={12} fill={c ?? "#222"} /></g>;
      case "trophy":
        return <g fill={c ?? "#e3b341"}><rect x={-40} y={-20} width={80} height={20} rx={3} /><rect x={-10} y={-60} width={20} height={42} /><path d="M-45,-150 L45,-150 Q45,-60 0,-60 Q-45,-60 -45,-150 Z" /><path d="M-45,-140 Q-80,-130 -45,-100 M45,-140 Q80,-130 45,-100" fill="none" stroke={c ?? "#e3b341"} strokeWidth={8} /></g>;
      case "flower-pot":
        return <g><path d="M-40,-60 L40,-60 L32,0 L-32,0 Z" fill="#c0693e" /><line x1={0} y1={-60} x2={0} y2={-120} stroke="#4f8a49" strokeWidth={6} />{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-140} rx={9} ry={20} fill={c ?? "#e57f9a"} transform={`rotate(${a} 0 -122)`} />)}<circle cx={0} cy={-122} r={9} fill="#f2d27a" /></g>;
      case "food":
        return <g><ellipse cx={0} cy={-8} rx={75} ry={10} fill={WHITE} /><ellipse cx={-14} cy={-24} rx={40} ry={18} fill={c ?? "#d8a24a"} /><ellipse cx={26} cy={-20} rx={26} ry={12} fill="#6aa55a" /></g>;
      default:
        return null;
    }
  })();
  const shadow = layer.shadow && sp.mount !== "wall" ? SH(sp.w * (sp.big ? 1.02 : 1.1), sp.mount === "floor" ? 0.3 : 0.35) : null;
  return <g>{shadow}{body}</g>;
};
