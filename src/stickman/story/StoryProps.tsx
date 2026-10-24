import React from "react";

/**
 * Story objects and weather: what the narration says is happening is drawn next to the people (a gift being handed over, a dog, rain,
 * a letter, a crown...). Every prop is drawn standing on the origin (bottom centre), about 200 units tall, in the same flat style as the
 * characters. The names are mirrored in storyPlanner.ts (shorts-automation) and in cast.ts.
 */
export const STORY_PROPS = [
  "ball", "book", "bag", "letter", "gift", "food", "tea", "money", "phone", "laptop", "flowers", "tree", "dog", "cat", "cow", "bird", "horse",
  "car", "bus", "bicycle", "boat", "bed", "chair", "table", "lamp", "fire", "crown", "key", "trophy", "cake", "umbrella", "heart", "star",
  "chest", "diya", "door", "basket", "medicine", "clock", "bell", "sword", "rope", "stone", "candle", "mic", "camera", "cricket", "pot", "pot_mid", "pot_full",
] as const;
export type StoryPropName = (typeof STORY_PROPS)[number];

export const STORY_FX = ["none", "rain", "snow", "hearts", "sparkle", "lightning", "leaves", "smoke", "stars"] as const;
export type StoryFx = (typeof STORY_FX)[number];

export const PROP_ANIMS = ["none", "bounce", "float", "shake", "spin", "pop"] as const;
export type PropAnim = (typeof PROP_ANIMS)[number];

const OUT = "#2B2B2B";
const sw = { stroke: OUT, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const art = (name: StoryPropName, t: number): React.ReactNode => {
  switch (name) {
    case "ball": return <g><circle cx={0} cy={-45} r={45} fill="#E74C3C" {...sw} /><path d="M-45,-45 Q0,-20 45,-45 M0,-90 Q-20,-45 0,0" fill="none" {...sw} stroke="#fff" /></g>;
    case "book": return <g><rect x={-55} y={-70} width={110} height={70} rx={6} fill="#2E86DE" {...sw} /><rect x={-48} y={-62} width={96} height={54} fill="#F8F4E6" {...sw} /><line x1={0} y1={-62} x2={0} y2={-8} {...sw} /></g>;
    case "bag": return <g><rect x={-50} y={-110} width={100} height={110} rx={18} fill="#F39C12" {...sw} /><path d="M-26,-110 Q0,-150 26,-110" fill="none" {...sw} /><rect x={-34} y={-60} width={68} height={34} rx={8} fill="#E67E22" {...sw} /></g>;
    case "letter": return <g><rect x={-62} y={-80} width={124} height={80} rx={6} fill="#FDF2E9" {...sw} /><path d="M-62,-80 L0,-34 L62,-80" fill="none" {...sw} /><circle cx={0} cy={-30} r={9} fill="#C0392B" /></g>;
    case "gift": return <g><rect x={-60} y={-90} width={120} height={90} fill="#E84393" {...sw} /><rect x={-10} y={-90} width={20} height={90} fill="#F1C40F" {...sw} /><rect x={-66} y={-112} width={132} height={26} fill="#C2185B" {...sw} /><path d="M0,-112 Q-34,-150 -20,-118 M0,-112 Q34,-150 20,-118" fill="none" {...sw} stroke="#F1C40F" /></g>;
    case "food": return <g><ellipse cx={0} cy={-18} rx={80} ry={20} fill="#ECF0F1" {...sw} /><ellipse cx={-14} cy={-30} rx={44} ry={12} fill="#E6B566" {...sw} /><ellipse cx={30} cy={-34} rx={30} ry={9} fill="#D68910" {...sw} /><circle cx={-30} cy={-40} r={9} fill="#2ECC71" /></g>;
    case "tea": return <g><path d="M-38,-70 L-30,-6 Q0,6 30,-6 L38,-70 Z" fill="#fff" {...sw} /><path d="M-36,-60 L36,-60 L33,-40 L-33,-40 Z" fill="#A0522D" /><path d="M38,-56 Q70,-50 38,-24" fill="none" {...sw} /><path d={`M-10,-84 q-8,-12 0,-24 M10,-84 q8,-12 0,-24`} fill="none" stroke="#bbb" strokeWidth={4} opacity={0.6 + 0.4 * Math.sin(t * 0.2)} /></g>;
    case "money": return <g>{[0, 1, 2].map((i) => <rect key={i} x={-60 + i * 8} y={-60 - i * 12} width={110} height={48} rx={5} fill={["#27AE60", "#2ECC71", "#58D68D"][i]} {...sw} />)}<circle cx={-6} cy={-72} r={14} fill="#F1C40F" {...sw} /><circle cx={70} cy={-14} r={14} fill="#F1C40F" {...sw} /></g>;
    case "phone": return <g><rect x={-30} y={-110} width={60} height={110} rx={10} fill="#34495E" {...sw} /><rect x={-24} y={-100} width={48} height={80} rx={4} fill="#85C1E9" /></g>;
    case "laptop": return <g><rect x={-62} y={-92} width={124} height={78} rx={6} fill="#2C3E50" {...sw} /><rect x={-54} y={-84} width={108} height={62} fill="#85C1E9" /><path d="M-80,-14 L80,-14 L66,0 L-66,0 Z" fill="#95A5A6" {...sw} /></g>;
    case "flowers": return <g>{[-30, 0, 30].map((x, i) => <g key={i}><line x1={x} y1={0} x2={x} y2={-70 - i * 8} stroke="#27AE60" strokeWidth={6} />{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={x + 14 * Math.cos((a * Math.PI) / 180)} cy={-76 - i * 8 + 14 * Math.sin((a * Math.PI) / 180)} rx={10} ry={13} transform={`rotate(${a} ${x + 14 * Math.cos((a * Math.PI) / 180)} ${-76 - i * 8 + 14 * Math.sin((a * Math.PI) / 180)})`} fill={["#E84393", "#F1C40F", "#E74C3C"][i]} {...sw} strokeWidth={2.5} />)}<circle cx={x} cy={-76 - i * 8} r={9} fill="#F9E79F" /></g>)}</g>;
    case "tree": return <g><rect x={-14} y={-130} width={28} height={130} fill="#7B5230" {...sw} /><circle cx={0} cy={-170} r={78} fill="#3E8E4F" {...sw} /><circle cx={-52} cy={-130} r={48} fill="#3E8E4F" {...sw} /><circle cx={54} cy={-132} r={50} fill="#3E8E4F" {...sw} /></g>;
    case "dog": return <g><ellipse cx={0} cy={-46} rx={62} ry={32} fill="#C68642" {...sw} /><circle cx={58} cy={-72} r={28} fill="#C68642" {...sw} /><ellipse cx={74} cy={-96} rx={10} ry={20} fill="#8E5A2B" {...sw} transform="rotate(20 74 -96)" /><circle cx={66} cy={-76} r={4} fill="#222" /><circle cx={84} cy={-66} r={6} fill="#222" />{[-36, -10, 22, 46].map((x) => <rect key={x} x={x - 7} y={-30} width={14} height={30} rx={6} fill="#A0692F" {...sw} />)}<path d={`M-60,-56 q-22,${-20 + Math.sin(t * 0.4) * 10} -6,-40`} fill="none" {...sw} stroke="#C68642" strokeWidth={9} /></g>;
    case "cat": return <g><ellipse cx={0} cy={-40} rx={46} ry={30} fill="#9B9B9B" {...sw} /><circle cx={44} cy={-66} r={26} fill="#9B9B9B" {...sw} /><path d="M26,-84 L30,-108 L44,-88 M52,-90 L64,-108 L68,-82" fill="#9B9B9B" {...sw} /><circle cx={38} cy={-68} r={3.5} fill="#222" /><circle cx={54} cy={-68} r={3.5} fill="#222" />{[-26, 16].map((x) => <rect key={x} x={x - 6} y={-26} width={12} height={26} rx={5} fill="#8A8A8A" {...sw} />)}<path d={`M-44,-50 q-30,${-10 + Math.sin(t * 0.3) * 8} -14,-50`} fill="none" {...sw} stroke="#9B9B9B" strokeWidth={8} /></g>;
    case "cow": return <g><ellipse cx={0} cy={-80} rx={90} ry={46} fill="#fff" {...sw} /><circle cx={-24} cy={-90} r={18} fill="#333" /><circle cx={30} cy={-72} r={14} fill="#333" /><rect x={74} y={-120} width={52} height={50} rx={16} fill="#fff" {...sw} /><ellipse cx={116} cy={-82} rx={14} ry={10} fill="#F5B7B1" {...sw} />{[-62, -30, 34, 62].map((x) => <rect key={x} x={x - 8} y={-52} width={16} height={52} rx={6} fill="#fff" {...sw} />)}</g>;
    case "bird": return <g transform={`translate(0,${-90 + Math.sin(t * 0.2) * 6})`}><ellipse cx={0} cy={0} rx={28} ry={18} fill="#3498DB" {...sw} /><circle cx={24} cy={-10} r={12} fill="#3498DB" {...sw} /><path d="M34,-10 L48,-6 L34,-2 Z" fill="#F1C40F" {...sw} strokeWidth={2} /><path d={`M-6,-4 Q-24,${-34 + Math.sin(t * 0.5) * 16} -34,-6`} fill="#2E86C1" {...sw} /></g>;
    case "horse": return <g><ellipse cx={0} cy={-90} rx={78} ry={40} fill="#A0522D" {...sw} /><path d="M58,-110 L96,-170 L120,-150 L96,-96 Z" fill="#A0522D" {...sw} /><ellipse cx={116} cy={-150} rx={24} ry={16} fill="#A0522D" {...sw} transform="rotate(-30 116 -150)" />{[-54, -26, 30, 58].map((x) => <rect key={x} x={x - 7} y={-56} width={14} height={56} rx={5} fill="#8B4513" {...sw} />)}<path d="M52,-150 Q70,-160 84,-130" fill="none" stroke="#3E2723" strokeWidth={10} strokeLinecap="round" /></g>;
    case "car": return <g><path d="M-100,-28 L-84,-62 Q-70,-84 -40,-84 L40,-84 Q70,-84 84,-58 L100,-28 Z" fill="#E74C3C" {...sw} /><rect x={-112} y={-40} width={224} height={30} rx={10} fill="#C0392B" {...sw} /><path d="M-62,-80 L-48,-60 L-2,-60 L-2,-80 Z M6,-80 L6,-60 L58,-60 L42,-80 Z" fill="#AED6F1" {...sw} strokeWidth={2.5} />{[-66, 66].map((x) => <g key={x}><circle cx={x} cy={-8} r={22} fill="#333" {...sw} /><circle cx={x} cy={-8} r={8} fill="#BDC3C7" /></g>)}</g>;
    case "bus": return <g><rect x={-130} y={-120} width={260} height={96} rx={14} fill="#F1C40F" {...sw} />{[-100, -50, 0, 50, 100].map((x) => <rect key={x} x={x - 18} y={-106} width={36} height={34} fill="#AED6F1" {...sw} strokeWidth={2.5} />)}{[-80, 80].map((x) => <g key={x}><circle cx={x} cy={-18} r={22} fill="#333" {...sw} /><circle cx={x} cy={-18} r={8} fill="#BDC3C7" /></g>)}</g>;
    case "bicycle": return <g>{[-56, 56].map((x) => <circle key={x} cx={x} cy={-44} r={44} fill="none" {...sw} />)}<path d="M-56,-44 L-8,-100 L40,-100 L56,-44 M-8,-100 L12,-44 L-56,-44 M40,-100 L36,-120" fill="none" {...sw} stroke="#E74C3C" strokeWidth={6} /></g>;
    case "boat": return <g><path d="M-110,-50 L110,-50 L80,0 L-80,0 Z" fill="#8E5A2B" {...sw} /><line x1={0} y1={-50} x2={0} y2={-190} {...sw} /><path d="M6,-186 L86,-70 L6,-70 Z" fill="#fff" {...sw} /></g>;
    case "bed": return <g><rect x={-110} y={-60} width={220} height={40} rx={10} fill="#5DADE2" {...sw} /><rect x={-110} y={-100} width={36} height={80} rx={8} fill="#8E5A2B" {...sw} /><rect x={-102} y={-84} width={64} height={28} rx={12} fill="#fff" {...sw} /><rect x={-110} y={-20} width={14} height={20} fill="#6B4A2B" /><rect x={96} y={-20} width={14} height={20} fill="#6B4A2B" /></g>;
    case "chair": return <g><rect x={-40} y={-70} width={80} height={14} rx={5} fill="#8E5A2B" {...sw} /><rect x={-40} y={-140} width={14} height={72} rx={5} fill="#8E5A2B" {...sw} /><rect x={-34} y={-56} width={10} height={56} fill="#6B4A2B" /><rect x={24} y={-56} width={10} height={56} fill="#6B4A2B" /></g>;
    case "table": return <g><rect x={-90} y={-80} width={180} height={16} rx={5} fill="#A0692F" {...sw} /><rect x={-78} y={-64} width={14} height={64} fill="#8E5A2B" {...sw} /><rect x={64} y={-64} width={14} height={64} fill="#8E5A2B" {...sw} /></g>;
    case "lamp": return <g><rect x={-6} y={-130} width={12} height={130} fill="#7F8C8D" {...sw} /><path d="M-40,-130 L-22,-176 L22,-176 L40,-130 Z" fill="#F7DC6F" {...sw} /><ellipse cx={0} cy={-100} rx={90} ry={60} fill="#F7DC6F" opacity={0.18} /></g>;
    case "fire": return <g><path d={`M0,0 Q-50,-30 -30,-80 Q-24,-50 -10,-60 Q-20,-110 10,-130 Q10,-90 30,-80 Q54,-40 0,0 Z`} fill="#E67E22" {...sw} transform={`scale(${1 + Math.sin(t * 0.4) * 0.06},${1 + Math.sin(t * 0.5) * 0.08})`} /><path d="M0,-4 Q-24,-24 -10,-54 Q10,-40 8,-64 Q30,-30 0,-4 Z" fill="#F1C40F" /></g>;
    case "crown": return <g><path d="M-52,-10 L-60,-70 L-26,-40 L0,-84 L26,-40 L60,-70 L52,-10 Z" fill="#F1C40F" {...sw} /><circle cx={0} cy={-84} r={8} fill="#E74C3C" {...sw} strokeWidth={2.5} /></g>;
    case "key": return <g><circle cx={0} cy={-100} r={30} fill="none" {...sw} stroke="#F1C40F" strokeWidth={12} /><rect x={-6} y={-70} width={12} height={74} fill="#F1C40F" {...sw} /><rect x={6} y={-24} width={22} height={10} fill="#F1C40F" {...sw} /><rect x={6} y={-44} width={16} height={10} fill="#F1C40F" {...sw} /></g>;
    case "trophy": return <g><path d="M-44,-130 L44,-130 Q40,-70 0,-62 Q-40,-70 -44,-130 Z" fill="#F1C40F" {...sw} /><path d="M-44,-120 Q-76,-120 -66,-90 Q-60,-76 -40,-78 M44,-120 Q76,-120 66,-90 Q60,-76 40,-78" fill="none" {...sw} /><rect x={-8} y={-62} width={16} height={36} fill="#D4AC0D" {...sw} /><rect x={-34} y={-26} width={68} height={26} rx={5} fill="#7F8C8D" {...sw} /></g>;
    case "cake": return <g><rect x={-70} y={-60} width={140} height={60} rx={8} fill="#F5B7B1" {...sw} /><rect x={-70} y={-66} width={140} height={20} rx={10} fill="#fff" {...sw} />{[-36, 0, 36].map((x) => <g key={x}><rect x={x - 4} y={-100} width={8} height={34} fill="#5DADE2" {...sw} strokeWidth={2.5} /><path d={`M${x},-104 q-6,-10 0,-18 q6,8 0,18`} fill="#F39C12" /></g>)}</g>;
    case "umbrella": return <g><path d="M-80,-100 Q0,-190 80,-100 Q56,-114 40,-100 Q20,-114 0,-100 Q-20,-114 -40,-100 Q-56,-114 -80,-100 Z" fill="#E74C3C" {...sw} /><line x1={0} y1={-100} x2={0} y2={-8} {...sw} /><path d="M0,-8 q0,14 -16,10" fill="none" {...sw} /></g>;
    case "heart": return <g transform={`translate(0,${-60 + Math.sin(t * 0.15) * 6})`}><path d="M0,40 C-70,-10 -40,-60 0,-24 C40,-60 70,-10 0,40 Z" fill="#E74C3C" {...sw} /></g>;
    case "star": return <g transform={`translate(0,${-60}) rotate(${Math.sin(t * 0.1) * 8})`}><path d="M0,-50 L14,-16 L50,-14 L22,8 L32,44 L0,24 L-32,44 L-22,8 L-50,-14 L-14,-16 Z" fill="#F1C40F" {...sw} /></g>;
    case "chest": return <g><rect x={-70} y={-60} width={140} height={60} rx={6} fill="#8E5A2B" {...sw} /><path d="M-70,-60 Q0,-120 70,-60 Z" fill="#A0692F" {...sw} /><rect x={-10} y={-70} width={20} height={26} rx={4} fill="#F1C40F" {...sw} /></g>;
    case "diya": return <g><path d="M-44,-30 Q0,10 44,-30 Z" fill="#D35400" {...sw} /><path d={`M0,-34 q-14,-22 0,-48 q14,26 0,48`} fill="#F39C12" transform={`scale(${1 + Math.sin(t * 0.4) * 0.08})`} /><ellipse cx={0} cy={-60} rx={60} ry={50} fill="#F7DC6F" opacity={0.18} /></g>;
    case "door": return <g><rect x={-50} y={-190} width={100} height={190} rx={6} fill="#8E5A2B" {...sw} /><rect x={-36} y={-172} width={72} height={70} rx={4} fill="#A0692F" {...sw} strokeWidth={2.5} /><circle cx={32} cy={-90} r={7} fill="#F1C40F" {...sw} strokeWidth={2} /></g>;
    case "basket": return <g><path d="M-60,-60 L-46,0 L46,0 L60,-60 Z" fill="#D4A55A" {...sw} /><path d="M-60,-60 Q0,-130 60,-60" fill="none" {...sw} /><circle cx={-18} cy={-70} r={14} fill="#E74C3C" {...sw} strokeWidth={2.5} /><circle cx={16} cy={-72} r={14} fill="#F39C12" {...sw} strokeWidth={2.5} /></g>;
    case "medicine": return <g><rect x={-40} y={-90} width={80} height={90} rx={10} fill="#ECF0F1" {...sw} /><rect x={-34} y={-110} width={68} height={24} rx={6} fill="#E74C3C" {...sw} /><rect x={-8} y={-74} width={16} height={46} fill="#E74C3C" /><rect x={-23} y={-59} width={46} height={16} fill="#E74C3C" /></g>;
    case "clock": return <g><circle cx={0} cy={-70} r={62} fill="#fff" {...sw} />{[0, 1, 2, 3].map((i) => <line key={i} x1={0} y1={-70 - 52} x2={0} y2={-70 - 44} transform={`rotate(${i * 90} 0 -70)`} {...sw} />)}<line x1={0} y1={-70} x2={0} y2={-70 - 40} transform={`rotate(${t * 3} 0 -70)`} {...sw} /><line x1={0} y1={-70} x2={0} y2={-70 - 26} transform={`rotate(${t * 0.25} 0 -70)`} {...sw} /></g>;
    case "bell": return <g transform={`rotate(${Math.sin(t * 0.4) * 12} 0 -130)`}><path d="M-44,-20 Q-44,-100 0,-122 Q44,-100 44,-20 Z" fill="#F1C40F" {...sw} /><circle cx={0} cy={-8} r={9} fill="#D4AC0D" {...sw} strokeWidth={2.5} /></g>;
    case "sword": return <g><rect x={-6} y={-190} width={12} height={150} fill="#BDC3C7" {...sw} /><rect x={-34} y={-44} width={68} height={12} rx={4} fill="#F1C40F" {...sw} /><rect x={-7} y={-34} width={14} height={34} fill="#8E5A2B" {...sw} /></g>;
    case "rope": return <g><path d="M-70,-10 Q-30,-60 0,-20 Q30,20 70,-30" fill="none" stroke="#C49A6C" strokeWidth={10} strokeLinecap="round" /></g>;
    case "stone": return <g><path d="M-60,0 L-50,-50 L-10,-72 L40,-60 L64,0 Z" fill="#95A5A6" {...sw} /></g>;
    case "candle": return <g><rect x={-14} y={-90} width={28} height={90} rx={4} fill="#FDEBD0" {...sw} /><path d={`M0,-94 q-10,-18 0,-40 q10,22 0,40`} fill="#F39C12" transform={`scale(${1 + Math.sin(t * 0.5) * 0.1})`} /></g>;
    case "mic": return <g><rect x={-6} y={-60} width={12} height={60} fill="#7F8C8D" {...sw} /><circle cx={0} cy={-84} r={24} fill="#2C3E50" {...sw} /></g>;
    case "camera": return <g><rect x={-60} y={-90} width={120} height={80} rx={10} fill="#34495E" {...sw} /><circle cx={0} cy={-52} r={26} fill="#85C1E9" {...sw} /><rect x={-24} y={-104} width={30} height={14} rx={4} fill="#34495E" {...sw} /></g>;
    case "cricket": return <g><path d="M-8,-170 L8,-170 L14,-46 L-14,-46 Z" fill="#D4A55A" {...sw} /><rect x={-9} y={-46} width={18} height={46} rx={6} fill="#2C3E50" {...sw} /></g>;
    case "pot": case "pot_mid": case "pot_full": {
      const lvl = name === "pot_full" ? 100 : name === "pot_mid" ? 55 : 10;
      return <g><path d="M-46,-70 Q-82,-110 -56,-150 L-26,-170 L26,-170 L56,-150 Q82,-110 46,-70 L36,0 L-36,0 Z" fill="#C0642B" {...sw} /><ellipse cx={0} cy={-170} rx={28} ry={8} fill="#7A3A12" {...sw} strokeWidth={3} /><path d="M-34,-12 L34,-12" stroke="#E08A52" strokeWidth={6} strokeLinecap="round" /><path d={`M-${30 + lvl * 0.14},${-lvl} L${30 + lvl * 0.14},${-lvl}`} stroke="#5DADE2" strokeWidth={10} strokeLinecap="round" opacity={0.9} /></g>;
    }
    default: return null;
  }
};

interface PropProps { type: StoryPropName; anim?: PropAnim; frame: number; delay?: number }
export const StoryPropArt: React.FC<PropProps> = ({ type, anim = "none", frame, delay = 0 }) => {
  const f = Math.max(0, frame - delay);
  const pop = Math.min(1, f / 8);
  const dy = anim === "bounce" ? -Math.abs(Math.sin(f * 0.18)) * 40 : anim === "float" ? Math.sin(f * 0.08) * 14 - 20 : 0;
  const dx = anim === "shake" ? Math.sin(f * 1.1) * 6 : 0;
  const rot = anim === "spin" ? f * 6 : 0;
  const s = anim === "pop" || true ? 0.6 + 0.4 * (1 - Math.pow(1 - pop, 3)) : 1;
  return (
    <g transform={`translate(${dx},${dy}) rotate(${rot} 0 -60) scale(${s})`} opacity={Math.min(1, f / 6)}>
      {art(type, frame)}
    </g>
  );
};

/** Weather and mood layers over the whole frame. */
export const StoryFxLayer: React.FC<{ fx: StoryFx; frame: number; w: number; h: number }> = ({ fx, frame, w, h }) => {
  if (fx === "none") return null;
  const rnd = (i: number, k: number) => ((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1 + 1) % 1;
  if (fx === "rain") {
    return <g>{Array.from({ length: 70 }, (_, i) => { const x = rnd(i, 1) * (w + 200) - 100; const y = ((rnd(i, 2) * h + frame * (28 + (i % 5) * 4)) % (h + 100)) - 50; return <line key={i} x1={x} y1={y} x2={x - 14} y2={y + 42} stroke="#BFD9F2" strokeWidth={3} opacity={0.7} />; })}<rect width={w} height={h} fill="#0B1D3A" opacity={0.18} /></g>;
  }
  if (fx === "snow") return <g>{Array.from({ length: 60 }, (_, i) => <circle key={i} cx={(rnd(i, 1) * w + Math.sin(frame * 0.05 + i) * 30 + w) % w} cy={((rnd(i, 2) * h + frame * (3 + (i % 4))) % (h + 20)) - 10} r={4 + (i % 4)} fill="#fff" opacity={0.85} />)}</g>;
  if (fx === "hearts") return <g>{Array.from({ length: 10 }, (_, i) => <path key={i} d="M0,14 C-24,-4 -14,-22 0,-8 C14,-22 24,-4 0,14 Z" fill="#E84393" opacity={0.8} transform={`translate(${rnd(i, 1) * w},${h * 0.7 - ((frame * (1.6 + (i % 3) * 0.5) + rnd(i, 2) * 600) % (h * 0.6))}) scale(${1 + (i % 3) * 0.5})`} />)}</g>;
  if (fx === "sparkle" || fx === "stars") return <g>{Array.from({ length: 18 }, (_, i) => <path key={i} d="M0,-14 L4,-4 L14,0 L4,4 L0,14 L-4,4 L-14,0 L-4,-4 Z" fill="#FFF3B0" opacity={0.2 + 0.8 * Math.abs(Math.sin(frame * 0.12 + i * 1.7))} transform={`translate(${rnd(i, 1) * w},${rnd(i, 2) * h * 0.65}) scale(${0.6 + rnd(i, 3)})`} />)}</g>;
  if (fx === "lightning") { const on = frame % 90 > 82 || (frame % 90 > 76 && frame % 3 === 0); return <g><rect width={w} height={h} fill="#102040" opacity={0.28} />{on && <><rect width={w} height={h} fill="#fff" opacity={0.35} /><path d={`M${w * 0.6},0 L${w * 0.52},${h * 0.2} L${w * 0.58},${h * 0.2} L${w * 0.5},${h * 0.42}`} fill="none" stroke="#FFF59D" strokeWidth={10} strokeLinejoin="round" /></>}</g>; }
  if (fx === "leaves") return <g>{Array.from({ length: 16 }, (_, i) => <ellipse key={i} rx={10} ry={5} fill={["#D35400", "#F39C12", "#27AE60"][i % 3]} transform={`translate(${(rnd(i, 1) * w + frame * 2 + Math.sin(frame * 0.07 + i) * 40) % w},${((rnd(i, 2) * h + frame * (2 + (i % 3))) % h)}) rotate(${frame * 3 + i * 40})`} />)}</g>;
  if (fx === "smoke") return <g>{Array.from({ length: 8 }, (_, i) => <circle key={i} cx={w * 0.5 + Math.sin(frame * 0.05 + i) * 40 + i * 10} cy={h * 0.55 - ((frame * 2 + i * 70) % 380)} r={30 + ((frame * 0.5 + i * 20) % 60)} fill="#999" opacity={0.25} />)}</g>;
  return null;
};
