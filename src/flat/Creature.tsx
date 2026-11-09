import React from "react";
import { z } from "zod";
import { shade } from "./spec";

/**
 * Creatures and heads from a body plan: the planner's LLM describes a creature the catalog does not have (a tortoise, a camel,
 * a crocodile, a boar...) or an animal head on a person (Narasimha's lion, Varaha's boar, Hayagriva's horse), and this code
 * draws it in the engine's style: side view facing right standing on y = 0 (creatures), or a front-view head on the neck.
 * A plan can only produce clean, complete drawings; unknown values fall back.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const col = (d: string) => hex.catch(d).default(d);
const pick = <T extends readonly [string, ...string[]]>(l: T, d: T[number]) => z.enum(l).catch(d).default(d);
const unit = (d: number) => z.number().min(0).max(1).catch(d).default(d);

export const CreatureSchema = z.object({
  /** size in body units (a grown person is 1000 tall): to the top of the back, and nose to tail */
  height: z.number().min(60).max(1400).catch(500).default(500),
  length: z.number().min(80).max(1800).catch(700).default(700),
  body: pick(["oval", "long", "round", "slim"] as const, "oval"),
  color: col("#b07a4a"),
  belly: col("#d9b48a"),
  legs: z.union([z.literal(0), z.literal(2), z.literal(4), z.literal(6)]).catch(4).default(4),
  legLength: unit(0.45), legThick: unit(0.4),
  neck: unit(0.3),
  head: pick(["round", "long", "flat", "beak", "snout"] as const, "round"),
  headSize: unit(0.5),
  ears: pick(["none", "round", "pointed", "long", "floppy"] as const, "none"),
  horns: pick(["none", "curved", "straight", "antlers", "tusks"] as const, "none"),
  hornColor: col("#efe6d2"),
  mane: z.boolean().catch(false).default(false), maneColor: col("#7a4a1a"),
  trunk: z.boolean().catch(false).default(false),
  hump: z.boolean().catch(false).default(false),
  shell: z.boolean().catch(false).default(false), shellColor: col("#5a8a4c"),
  tail: pick(["none", "thin", "bushy", "fan", "fish", "long"] as const, "thin"),
  wings: z.boolean().catch(false).default(false), wingColor: col("#8a6a4a"),
  pattern: pick(["none", "spots", "stripes", "scales"] as const, "none"), patternColor: col("#5a3a20"),
});
export type CreatureSpec = z.infer<typeof CreatureSchema>;

/** An animal head on a person's body (front view), from a plan: Narasimha, Varaha, Hayagriva, a bear-headed Jambavan... */
export const HeadKitSchema = z.object({
  shape: pick(["round", "long", "wide"] as const, "round"),
  color: col("#d9a046"),
  muzzle: pick(["none", "small", "big", "snout", "beak"] as const, "small"), muzzleColor: col("#f2d7a8"),
  mane: z.boolean().catch(false).default(false), maneColor: col("#8a4f1c"),
  ears: pick(["none", "round", "pointed", "long"] as const, "round"),
  horns: pick(["none", "curved", "straight"] as const, "none"), hornColor: col("#efe6d2"),
  tusks: z.boolean().catch(false).default(false),
  trunk: z.boolean().catch(false).default(false),
  fangs: z.boolean().catch(false).default(false),
  fierce: z.boolean().catch(false).default(false),
});
export type HeadKitSpec = z.infer<typeof HeadKitSchema>;

const Eye = ({ x, y, r, blink = 1 }: { x: number; y: number; r: number; blink?: number }) => blink < 0.5
  ? <path d={`M ${x - r} ${y} Q ${x} ${y + r * 0.6} ${x + r} ${y}`} stroke="#1b1414" strokeWidth={r * 0.45} fill="none" strokeLinecap="round" />
  : <g><circle cx={x} cy={y} r={r * 1.35} fill="#fbf8f2" /><circle cx={x + r * 0.2} cy={y} r={r} fill="#1b1414" /><circle cx={x + r * 0.5} cy={y - r * 0.35} r={r * 0.32} fill="#fff" /></g>;

/** A creature from its plan: side view, facing right, feet on y = 0. */
export const Creature: React.FC<{ spec: CreatureSpec; t: number; walking: boolean }> = ({ spec: c, t, walking }) => {
  const d = shade(c.color, -0.2), L = c.length, Hh = c.height;
  const legLen = c.legs ? Hh * (0.12 + c.legLength * 0.5) : 0;
  const bodyW = L * (c.body === "long" ? 0.7 : c.body === "round" ? 0.5 : 0.58);
  const bodyH = Math.max(40, Math.min(Hh - legLen, bodyW * (c.body === "long" ? 0.32 : c.body === "round" ? 0.75 : c.body === "slim" ? 0.36 : 0.5)));
  const cy = -legLen - bodyH / 2 + (c.legs ? bodyH * 0.08 : 0);
  const legW = 16 + c.legThick * 70;
  const ph = t * 1.4, swish = Math.sin(t * 2.2) * 8, nod = Math.sin(t * 1.3) * 3 + (walking ? Math.sin(ph * Math.PI * 4) * 5 : 0);
  const bob = walking ? -Math.abs(Math.sin(ph * Math.PI * 2)) * 8 : Math.sin(t * 1.8) * 1.5;
  // legs: far pair darker and behind the body, near pair in front; they swing opposite each other while walking
  const legXs = c.legs === 2 ? [-bodyW * 0.06, bodyW * 0.08] : c.legs === 6 ? [-bodyW * 0.3, 0, bodyW * 0.3] : [-bodyW * 0.32, bodyW * 0.3];
  const leg = (x: number, i: number, far: boolean) => {
    const sw = walking ? Math.sin(ph * Math.PI * 2 + (i % 2 ? Math.PI : 0) + (far ? Math.PI : 0)) * 0.3 : 0;
    const top = cy + bodyH * 0.25, fx = x + Math.sin(sw) * legLen, fy = -2;
    return <g key={`${far}${i}`}><line x1={x} y1={top} x2={fx} y2={fy - legW * 0.3} stroke={far ? d : c.color} strokeWidth={legW} strokeLinecap="round" />
      <ellipse cx={fx + legW * 0.15} cy={fy - legW * 0.15} rx={legW * 0.62} ry={legW * 0.3} fill={shade(c.color, -0.4)} /></g>;
  };
  // head: at the end of the neck, front-right
  const hs = Math.max(40, bodyH * (0.45 + c.headSize * 0.55));
  const neckLen = c.neck * Hh * 0.55;
  const nx0 = bodyW * 0.42, ny0 = cy - bodyH * 0.18;
  const hx = nx0 + neckLen * 0.55 + hs * 0.35, hy = ny0 - neckLen * 0.85 + nod;
  const tailX = -bodyW / 2;
  let tail: React.ReactNode = null;
  if (c.tail === "thin") tail = <path d={`M ${tailX + 10} ${cy - bodyH * 0.2} Q ${tailX - bodyH * 0.5} ${cy - bodyH * 0.1 + swish} ${tailX - bodyH * 0.45} ${cy + bodyH * 0.5}`} stroke={d} strokeWidth={Math.max(6, legW * 0.25)} fill="none" strokeLinecap="round" />;
  if (c.tail === "bushy") tail = <g><path d={`M ${tailX + 10} ${cy - bodyH * 0.2} Q ${tailX - bodyH * 0.5} ${cy + swish} ${tailX - bodyH * 0.5} ${cy + bodyH * 0.4}`} stroke={d} strokeWidth={legW * 0.35} fill="none" strokeLinecap="round" /><ellipse cx={tailX - bodyH * 0.5} cy={cy + bodyH * 0.5} rx={bodyH * 0.14} ry={bodyH * 0.24} fill={c.maneColor} /></g>;
  if (c.tail === "long") tail = <path d={`M ${tailX + 20} ${cy - bodyH * 0.3} Q ${tailX - L * 0.2} ${cy + swish} ${tailX - L * 0.32} ${-12} L ${tailX - L * 0.3} ${-2} Q ${tailX - L * 0.1} ${cy + bodyH * 0.4} ${tailX + 20} ${cy + bodyH * 0.25} Z`} fill={c.color} />;
  if (c.tail === "fish") tail = <path d={`M ${tailX + 10} ${cy} L ${tailX - bodyH * 0.7} ${cy - bodyH * 0.5 + swish} L ${tailX - bodyH * 0.55} ${cy} L ${tailX - bodyH * 0.7} ${cy + bodyH * 0.5 + swish} Z`} fill={d} />;
  if (c.tail === "fan") tail = <g>{[-40, -20, 0, 20, 40].map((a) => <ellipse key={a} cx={tailX - bodyH * 0.4} cy={cy - bodyH * 0.2} rx={bodyH * 0.12} ry={bodyH * 0.5} fill={d} transform={`rotate(${a - 30 + swish * 0.5} ${tailX} ${cy})`} />)}</g>;
  const headEl = (() => {
    const r = hs / 2;
    const muz = c.head === "long" ? <ellipse cx={hx + r * 0.9} cy={hy + r * 0.25} rx={r * 0.85} ry={r * 0.5} fill={c.color} />
      : c.head === "flat" ? <path d={`M ${hx - r * 0.3} ${hy - r * 0.35} L ${hx + r * 2.2} ${hy + r * 0.05} L ${hx + r * 2.2} ${hy + r * 0.45} L ${hx - r * 0.3} ${hy + r * 0.55} Z`} fill={c.color} />
      : c.head === "snout" ? <g><rect x={hx + r * 0.4} y={hy - r * 0.1} width={r * 0.9} height={r * 0.7} rx={r * 0.3} fill={shade(c.color, 0.12)} /><ellipse cx={hx + r * 1.3} cy={hy + r * 0.25} rx={r * 0.18} ry={r * 0.36} fill={shade(c.color, -0.1)} /><circle cx={hx + r * 1.32} cy={hy + r * 0.12} r={r * 0.06} fill="#2a1d16" /><circle cx={hx + r * 1.32} cy={hy + r * 0.38} r={r * 0.06} fill="#2a1d16" /></g>
      : c.head === "beak" ? <path d={`M ${hx + r * 0.7} ${hy - r * 0.15} L ${hx + r * 1.6} ${hy + r * 0.15} L ${hx + r * 0.7} ${hy + r * 0.4} Z`} fill="#e9b43a" /> : null;
    return (
      <g>
        {c.mane && <g>{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={hx + Math.cos(a) * r * 1.05} cy={hy + Math.sin(a) * r * 1.05} r={r * 0.55} fill={c.maneColor} />; })}</g>}
        {c.ears === "long" && <ellipse cx={hx - r * 0.45} cy={hy - r * 1.05} rx={r * 0.22} ry={r * 0.6} fill={d} transform={`rotate(-20 ${hx - r * 0.45} ${hy - r * 1.05})`} />}
        {c.ears === "pointed" && <path d={`M ${hx - r * 0.6} ${hy - r * 0.5} L ${hx - r * 0.35} ${hy - r * 1.35} L ${hx - r * 0.05} ${hy - r * 0.7} Z`} fill={d} />}
        {c.ears === "round" && <circle cx={hx - r * 0.45} cy={hy - r * 0.8} r={r * 0.32} fill={d} />}
        {c.horns === "curved" && <path d={`M ${hx - r * 0.2} ${hy - r * 0.7} Q ${hx - r * 0.9} ${hy - r * 1.6} ${hx - r * 0.2} ${hy - r * 1.9} Q ${hx - r * 0.5} ${hy - r * 1.4} ${hx + r * 0.1} ${hy - r * 0.8} Z`} fill={c.hornColor} />}
        {c.horns === "straight" && <path d={`M ${hx + r * 0.6} ${hy - r * 0.3} L ${hx + r * 1.0} ${hy - r * 1.3} L ${hx + r * 0.9} ${hy - r * 0.25} Z`} fill={c.hornColor} />}
        {c.horns === "antlers" && <path d={`M ${hx - r * 0.1} ${hy - r * 0.8} Q ${hx - r * 0.3} ${hy - r * 1.8} ${hx - r * 0.9} ${hy - r * 2.1} M ${hx - r * 0.2} ${hy - r * 1.4} Q ${hx - r * 0.6} ${hy - r * 1.5} ${hx - r * 0.9} ${hy - r * 1.3} M ${hx - r * 0.25} ${hy - r * 1.7} Q ${hx + r * 0.2} ${hy - r * 2.1} ${hx + r * 0.4} ${hy - r * 2.3}`} stroke="#7a5230" strokeWidth={r * 0.14} fill="none" strokeLinecap="round" />}
        <circle cx={hx} cy={hy} r={r} fill={c.color} />
        {muz}
        {c.ears === "floppy" && <ellipse cx={hx - r * 0.5} cy={hy + r * 0.1} rx={r * 0.3} ry={r * 0.65} fill={d} />}
        {c.trunk && <path d={`M ${hx + r * 0.6} ${hy} Q ${hx + r * 1.4} ${hy + r * 0.6} ${hx + r * 1.2} ${hy + r * 2.2} Q ${hx + r * 1.0} ${hy + r * 2.5} ${hx + r * 0.85} ${hy + r * 2.2} Q ${hx + r * 1.0} ${hy + r * 0.9} ${hx + r * 0.4} ${hy + r * 0.4} Z`} fill={c.color} />}
        {c.horns === "tusks" && <path d={`M ${hx + r * 0.7} ${hy + r * 0.45} Q ${hx + r * 1.4} ${hy + r * 0.6} ${hx + r * 1.5} ${hy - r * 0.1} Q ${hx + r * 1.2} ${hy + r * 0.35} ${hx + r * 0.65} ${hy + r * 0.25} Z`} fill={c.hornColor} />}
        <Eye x={hx + r * 0.25} y={hy - r * 0.2} r={Math.max(4, r * 0.16)} blink={((t + L) % 3.6) < 0.12 ? 0 : 1} />
      </g>
    );
  })();
  return (
    <g transform={`translate(0 ${bob})`}>
      {tail}
      {c.legs > 0 && legXs.map((x, i) => leg(x + bodyW * 0.05, i, true))}
      {c.wings && <ellipse cx={-bodyW * 0.05} cy={cy - bodyH * 0.2} rx={bodyW * 0.42} ry={bodyH * 0.38} fill={c.wingColor} transform={`rotate(${-10 + Math.sin(t * 8) * (c.legs === 2 ? 12 : 3)} 0 ${cy})`} />}
      {neckLen > 4 && <path d={`M ${nx0 - hs * 0.25} ${ny0 + bodyH * 0.1} L ${hx - hs * 0.3} ${hy} L ${hx + hs * 0.15} ${hy + hs * 0.2} L ${nx0 + hs * 0.25} ${ny0 + bodyH * 0.3} Z`} fill={c.color} />}
      <ellipse cx={0} cy={cy} rx={bodyW / 2} ry={bodyH / 2} fill={c.color} />
      <ellipse cx={bodyW * 0.03} cy={cy + bodyH * 0.22} rx={bodyW * 0.36} ry={bodyH * 0.2} fill={c.belly} />
      {c.pattern === "spots" && [[-0.25, -0.1], [0.05, -0.2], [0.2, 0.05], [-0.05, 0.12]].map(([px, py], i) => <ellipse key={i} cx={bodyW * px} cy={cy + bodyH * py} rx={bodyW * 0.07} ry={bodyH * 0.12} fill={c.patternColor} opacity={0.85} />)}
      {c.pattern === "stripes" && [-0.3, -0.15, 0, 0.15, 0.3].map((px) => <path key={px} d={`M ${bodyW * px} ${cy - bodyH * 0.48} q ${bodyW * 0.04} ${bodyH * 0.3} 0 ${bodyH * 0.6}`} stroke={c.patternColor} strokeWidth={bodyW * 0.03} fill="none" />)}
      {c.pattern === "scales" && Array.from({ length: 10 }, (_, i) => <path key={i} d={`M ${-bodyW * 0.4 + i * bodyW * 0.08} ${cy - bodyH * 0.35} l ${bodyW * 0.035} ${-bodyH * 0.18} l ${bodyW * 0.035} ${bodyH * 0.18} Z`} fill={c.patternColor} />)}
      {c.hump && <ellipse cx={-bodyW * 0.05} cy={cy - bodyH * 0.5} rx={bodyW * 0.22} ry={bodyH * 0.42} fill={c.color} />}
      {c.shell && (
        <g>
          <path d={`M ${-bodyW * 0.48} ${cy + bodyH * 0.05} Q ${-bodyW * 0.42} ${cy - bodyH * 1.25} 0 ${cy - bodyH * 1.2} Q ${bodyW * 0.42} ${cy - bodyH * 1.25} ${bodyW * 0.48} ${cy + bodyH * 0.05} Z`} fill={c.shellColor} />
          {[-0.28, 0, 0.28].map((px, i) => <path key={px} d={`M ${bodyW * px - bodyW * 0.1} ${cy - bodyH * (i === 1 ? 0.65 : 0.45)} l ${bodyW * 0.1} ${-bodyH * 0.22} l ${bodyW * 0.1} ${bodyH * 0.22} l ${-bodyW * 0.03} ${bodyH * 0.22} l ${-bodyW * 0.14} 0 Z`} fill={shade(c.shellColor, 0.18)} />)}
          <path d={`M ${-bodyW * 0.48} ${cy + bodyH * 0.05} L ${bodyW * 0.48} ${cy + bodyH * 0.05}`} stroke={shade(c.shellColor, -0.3)} strokeWidth={bodyH * 0.12} strokeLinecap="round" />
        </g>
      )}
      {headEl}
      {c.legs > 0 && legXs.map((x, i) => leg(x, i, false))}
    </g>
  );
};

/** An animal head on a person (front view), in the body units of src/flat/Character.tsx: centred on the face at y = -810. */
export const KitHead: React.FC<{ k: HeadKitSpec; blink: number; talkOpen: number }> = ({ k, blink, talkOpen }) => {
  const cy = -812, rx = k.shape === "wide" ? 104 : k.shape === "long" ? 78 : 92, ry = k.shape === "long" ? 112 : 98;
  const d = shade(k.color, -0.2);
  return (
    <g>
      {k.mane && <g>{Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <circle key={i} cx={Math.cos(a) * 128} cy={cy + 20 + Math.sin(a) * 132} r={58} fill={k.maneColor} />; })}<ellipse cx={0} cy={cy + 20} rx={150} ry={160} fill={k.maneColor} /></g>}
      {k.ears === "round" && [-1, 1].map((s) => <g key={s}><circle cx={s * rx * 0.85} cy={cy - ry * 0.8} r={30} fill={d} /><circle cx={s * rx * 0.85} cy={cy - ry * 0.8} r={16} fill={k.muzzleColor} /></g>)}
      {k.ears === "pointed" && [-1, 1].map((s) => <path key={s} d={`M ${s * rx * 0.5} ${cy - ry * 0.8} L ${s * rx * 0.95} ${cy - ry * 1.35} L ${s * rx * 1.0} ${cy - ry * 0.45} Z`} fill={d} />)}
      {k.ears === "long" && [-1, 1].map((s) => <ellipse key={s} cx={s * rx * 0.7} cy={cy - ry * 1.05} rx={20} ry={56} fill={d} transform={`rotate(${s * 18} ${s * rx * 0.7} ${cy - ry * 1.05})`} />)}
      {k.horns === "curved" && [-1, 1].map((s) => <path key={s} d={`M ${s * 40} ${cy - ry * 0.85} Q ${s * 140} ${cy - ry * 1.2} ${s * 110} ${cy - ry * 2.0} Q ${s * 100} ${cy - ry * 1.3} ${s * 10} ${cy - ry * 0.95} Z`} fill={k.hornColor} />)}
      {k.horns === "straight" && [-1, 1].map((s) => <path key={s} d={`M ${s * 30} ${cy - ry * 0.85} L ${s * 50} ${cy - ry * 1.7} L ${s * 60} ${cy - ry * 0.85} Z`} fill={k.hornColor} />)}
      <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill={k.color} />
      {/* eyes and brows (fierce: heavy brows pulled down) */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <Eye x={s * 34} y={cy - 22} r={9} blink={blink} />
          <path d={`M ${s * 14} ${cy - (k.fierce ? 36 : 44)} L ${s * 58} ${cy - (k.fierce ? 54 : 48)}`} stroke={d} strokeWidth={10} strokeLinecap="round" />
        </g>
      ))}
      {k.muzzle === "small" && <ellipse cx={0} cy={cy + 34} rx={44} ry={36} fill={k.muzzleColor} />}
      {k.muzzle === "big" && <path d={`M -62 ${cy + 4} Q 0 ${cy - 16} 62 ${cy + 4} Q 70 ${cy + 80} 0 ${cy + 92} Q -70 ${cy + 80} -62 ${cy + 4} Z`} fill={k.muzzleColor} />}
      {k.muzzle === "snout" && <g><ellipse cx={0} cy={cy + 40} rx={46} ry={34} fill={shade(k.color, 0.15)} /><ellipse cx={-14} cy={cy + 40} rx={8} ry={12} fill="#2a1d16" /><ellipse cx={14} cy={cy + 40} rx={8} ry={12} fill="#2a1d16" /></g>}
      {k.muzzle === "beak" && <path d={`M -30 ${cy + 4} Q 0 ${cy - 6} 30 ${cy + 4} Q 26 ${cy + 50} 0 ${cy + 88} Q -26 ${cy + 50} -30 ${cy + 4} Z`} fill="#f2a530" />}
      {(k.muzzle === "small" || k.muzzle === "big") && <path d={`M -14 ${cy + 14} L 14 ${cy + 14} L 0 ${cy + 30} Z`} fill="#3a2015" />}
      {k.trunk && <path d={`M -24 ${cy + 10} Q -30 ${cy + 110} -10 ${cy + 160} Q 10 ${cy + 200} 44 ${cy + 196} Q 64 ${cy + 190} 60 ${cy + 172} Q 40 ${cy + 180} 26 ${cy + 168} Q 16 ${cy + 120} 24 ${cy + 10} Z`} fill={k.color} />}
      {/* mouth: opens while talking; fangs and tusks around it */}
      {k.muzzle !== "beak" && (talkOpen > 0.1
        ? <ellipse cx={0} cy={cy + 60} rx={22} ry={6 + talkOpen * 12} fill="#5a1e1e" />
        : <path d={k.fierce ? `M -26 ${cy + 56} Q 0 ${cy + 76} 26 ${cy + 56}` : `M -20 ${cy + 58} Q 0 ${cy + 70} 20 ${cy + 58}`} stroke="#5a1e1e" strokeWidth={6} fill="none" strokeLinecap="round" />)}
      {k.fangs && [-1, 1].map((s) => <path key={s} d={`M ${s * 12} ${cy + 56} l ${s * 10} 0 l ${-s * 5} 20 z`} fill="#f7f2e8" />)}
      {k.tusks && [-1, 1].map((s) => <path key={s} d={`M ${s * 30} ${cy + 54} Q ${s * 70} ${cy + 60} ${s * 68} ${cy + 10} Q ${s * 56} ${cy + 46} ${s * 26} ${cy + 44} Z`} fill={k.hornColor} />)}
    </g>
  );
};
