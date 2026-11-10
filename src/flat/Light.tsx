import React from "react";

/**
 * The same place at another time or mood. `LightBack` goes between the background and the people (stars and a moon for night);
 * `LightFront` tints everything the people stand in (dusk warmth, night blue, a faded flashback, red danger edges).
 */
const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const LightBack: React.FC<{ kind: string; W: number; H: number; t: number }> = ({ kind, W, H, t }) => {
  const m = Math.min(W, H);
  if (kind === "dusk") return (
    <g>
      <circle cx={W * 0.5} cy={H * 0.58} r={m * 0.26} fill="#ffb15a" opacity={0.22} />
      <circle cx={W * 0.5} cy={H * 0.58} r={m * 0.16} fill="#ffd08a" opacity={0.95} />
    </g>
  );
  if (kind !== "night") return null;
  return (
    <g>
      {Array.from({ length: 46 }, (_, i) => <circle key={i} cx={rand(i) * W} cy={rand(i + 90) * H * 0.55} r={(1 + rand(i + 5) * 2) * (m / 1080) * 1.6} fill="#fff6d8" opacity={0.35 + 0.5 * Math.abs(Math.sin(t * (0.8 + rand(i + 9)) + i))} />)}
      <circle cx={W * 0.8} cy={H * 0.13} r={m * 0.09} fill="#fff4cf" opacity={0.18} />
      <circle cx={W * 0.8} cy={H * 0.13} r={m * 0.055} fill="#fff4cf" />
    </g>
  );
};

export const LightFront: React.FC<{ kind: string; W: number; H: number; uid: string }> = ({ kind, W, H, uid }) => {
  const id = `${uid}-light`;
  switch (kind) {
    case "dusk": return (
      <g pointerEvents="none">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a2f7a" stopOpacity={0.38} /><stop offset="0.7" stopColor="#ff8f45" stopOpacity={0.3} /><stop offset="1" stopColor="#b8452a" stopOpacity={0.28} /></linearGradient></defs>
        <rect width={W} height={H} fill={`url(#${id})`} />
      </g>
    );
    case "night": return <g pointerEvents="none"><rect width={W} height={H} fill="#0a1238" opacity={0.42} /></g>;
    case "flashback": return (
      <g pointerEvents="none">
        <defs><radialGradient id={id}><stop offset="0.45" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.55} /></radialGradient></defs>
        <rect width={W} height={H} fill="#8d8575" opacity={0.42} />
        <rect width={W} height={H} fill={`url(#${id})`} />
      </g>
    );
    case "danger": return (
      <g pointerEvents="none">
        <defs><radialGradient id={id}><stop offset="0.4" stopColor="#7a0a10" stopOpacity={0} /><stop offset="1" stopColor="#7a0a10" stopOpacity={0.7} /></radialGradient></defs>
        <rect width={W} height={H} fill="#3a0608" opacity={0.18} />
        <rect width={W} height={H} fill={`url(#${id})`} />
      </g>
    );
    default: return null;
  }
};
