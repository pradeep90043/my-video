import React from "react";

/**
 * Big things that are part of a place: a hill (that can be lifted), a throne, a yagya fire, a lotus, a thali of sweets, a tree,
 * a house, a boat, a chariot, pillars, a cloud to sit on. Same units as a person, standing on y = 0.
 */

const Flame = ({ x, y, k = 1, t }: { x: number; y: number; k?: number; t: number }) => {
  const f = 1 + Math.sin(t * 9 + x) * 0.08;
  return (
    <g transform={`translate(${x} ${y}) scale(${k} ${k * f})`}>
      <path d="M 0 -120 Q 60 -40 40 20 Q 20 50 0 50 Q -20 50 -40 20 Q -60 -40 0 -120 Z" fill="#ff8a1f" />
      <path d="M 0 -60 Q 28 -10 20 20 Q 10 34 0 34 Q -10 34 -20 20 Q -28 -10 0 -60 Z" fill="#ffd36e" />
    </g>
  );
};

export const SetPiece: React.FC<{ kind: string; t: number }> = ({ kind, t }) => {
  switch (kind) {
    case "hill": return (
      <g>
        <path d="M -700 0 Q -620 -560 0 -620 Q 620 -560 700 0 Z" fill="#4f9a55" />
        <path d="M -520 -200 Q -300 -330 -60 -250 Q 160 -330 420 -220" stroke="#3f8448" strokeWidth={14} fill="none" />
        {[-420, -200, 60, 300, 480].map((x, i) => (
          <g key={x} transform={`translate(${x} ${-430 - (i % 2) * 80 + Math.abs(x) * 0.25})`}>
            <rect x={-12} y={0} width={24} height={70} fill="#6b4226" /><circle cx={0} cy={-30} r={60} fill={i % 2 ? "#3f8448" : "#5aa860"} />
            {i % 2 === 0 && <><circle cx={-20} cy={-40} r={8} fill="#f2b53a" /><circle cx={18} cy={-20} r={8} fill="#e8443a" /></>}
          </g>
        ))}
        {[-300, 200].map((x) => <ellipse key={x} cx={x} cy={-130} rx={70} ry={36} fill="#8e8f87" />)}
        <path d="M -700 0 Q 0 60 700 0 L 640 60 Q 0 120 -640 60 Z" fill="#7a5530" />
      </g>
    );
    case "throne": return (
      <g>
        <path d="M -230 -900 Q 0 -1080 230 -900 L 230 -260 L -230 -260 Z" fill="#c9952f" />
        <path d="M -180 -880 Q 0 -1010 180 -880 L 180 -300 L -180 -300 Z" fill="#a8232c" />
        <circle cx={0} cy={-960} r={30} fill="#d6453a" stroke="#f2c14e" strokeWidth={10} />
        <rect x={-300} y={-300} width={600} height={90} rx={20} fill="#c9952f" />
        <rect x={-280} y={-210} width={50} height={210} fill="#a87a22" /><rect x={230} y={-210} width={50} height={210} fill="#a87a22" />
        <rect x={-340} y={-470} width={70} height={200} rx={20} fill="#c9952f" /><rect x={270} y={-470} width={70} height={200} rx={20} fill="#c9952f" />
      </g>
    );
    case "yagya": return (
      <g>
        <path d="M -260 0 L -200 -140 L 200 -140 L 260 0 Z" fill="#b5652e" />
        <path d="M -200 -140 L -160 -200 L 160 -200 L 200 -140 Z" fill="#cf7b3c" />
        <Flame x={-60} y={-230} k={1.1} t={t} /><Flame x={50} y={-250} k={1.4} t={t + 1} /><Flame x={0} y={-220} k={0.9} t={t + 2} />
        <circle cx={0} cy={-300} r={260} fill="#ff9a3c" opacity={0.12 + 0.05 * Math.sin(t * 5)} />
      </g>
    );
    case "lotus": return (
      <g>
        <ellipse cx={0} cy={-20} rx={300} ry={50} fill="#3f8f5a" />
        {[-70, -35, 0, 35, 70].map((a, i) => <ellipse key={a} cx={0} cy={-130} rx={70} ry={150} fill={i % 2 ? "#f08fb0" : "#f7b3cb"} transform={`rotate(${a} 0 -20)`} />)}
        <circle cx={0} cy={-90} r={40} fill="#f2c14e" />
      </g>
    );
    case "thali": return (
      <g>
        <ellipse cx={0} cy={-40} rx={300} ry={90} fill="#d9a83a" /><ellipse cx={0} cy={-50} rx={260} ry={72} fill="#e8bf55" />
        {[[-150, -60], [-60, -80], [40, -70], [140, -55], [-100, -30], [80, -30]].map(([x, y], i) => (
          <g key={i}><ellipse cx={x} cy={y} rx={48} ry={20} fill="#c9952f" /><circle cx={x} cy={y - 14} r={20} fill={["#f29d38", "#f7f3ea", "#e8443a", "#f2c14e"][i % 4]} /></g>
        ))}
        <g transform="translate(0 -110)"><path d="M -40 0 Q 0 30 40 0 Z" fill="#c8652a" /><Flame x={0} y={-10} k={0.35} t={t} /></g>
      </g>
    );
    case "tree": return (
      <g>
        <path d="M -40 0 L -24 -420 L 24 -420 L 40 0 Z" fill="#6b4226" />
        <circle cx={0} cy={-560} r={230} fill="#4f9a55" /><circle cx={-170} cy={-460} r={150} fill="#5aa860" /><circle cx={170} cy={-460} r={150} fill="#468c4c" />
        {[-120, 40, 150, -40].map((x, i) => <circle key={x} cx={x} cy={-520 - i * 30} r={6} fill="#fff27a" opacity={0.5 + 0.5 * Math.sin(t * 3 + i)} />)}
      </g>
    );
    case "house": return (
      <g>
        <rect x={-260} y={-380} width={520} height={380} fill="#e9c58f" />
        <path d="M -310 -380 L 0 -600 L 310 -380 Z" fill="#9b4a2c" />
        <path d="M -60 0 L -60 -200 Q 0 -260 60 -200 L 60 0 Z" fill="#6b3e22" />
        <rect x={-210} y={-300} width={90} height={80} fill="#ffd36e" /><rect x={120} y={-300} width={90} height={80} fill="#ffd36e" />
      </g>
    );
    case "boat": return (
      <g transform={`translate(0 ${Math.sin(t * 1.5) * 10}) rotate(${Math.sin(t * 1.2) * 2})`}>
        <path d="M -420 -160 L 420 -160 Q 380 -20 260 0 L -260 0 Q -380 -20 -420 -160 Z" fill="#8a5a34" />
        <path d="M -400 -150 L 400 -150" stroke="#b5843f" strokeWidth={14} />
        <line x1={0} y1={-160} x2={0} y2={-700} stroke="#6b4226" strokeWidth={18} /><path d="M 10 -680 L 300 -260 L 10 -260 Z" fill="#f4ecd8" />
      </g>
    );
    case "chariot": return (
      <g>
        <path d="M -300 -420 L 260 -420 L 300 -200 L -300 -200 Z" fill="#c9952f" /><path d="M -260 -420 Q -280 -600 -120 -640 L -120 -420 Z" fill="#a8232c" />
        <line x1={260} y1={-300} x2={520} y2={-260} stroke="#8a5a34" strokeWidth={18} />
        {[-160, 160].map((x) => <g key={x} transform={`translate(${x} -150) rotate(${t * 40})`}><circle r={150} fill="none" stroke="#6b4226" strokeWidth={24} />{[0, 45, 90, 135].map((a) => <line key={a} x1={-150} y1={0} x2={150} y2={0} stroke="#6b4226" strokeWidth={10} transform={`rotate(${a})`} />)}</g>)}
        <path d="M 120 -420 L 120 -820 L 240 -780 L 120 -740" fill="#ff8a1f" stroke="#6b4226" strokeWidth={6} />
      </g>
    );
    case "pillars": return (
      <g>
        {[-500, 500].map((x) => <g key={x}><rect x={x - 50} y={-1100} width={100} height={1100} fill="#e7b24a" /><rect x={x - 70} y={-1120} width={140} height={40} fill="#c9952f" /><rect x={x - 70} y={-40} width={140} height={40} fill="#c9952f" /></g>)}
        <path d="M -450 -1080 Q 0 -1300 450 -1080" stroke="#e7b24a" strokeWidth={40} fill="none" />
      </g>
    );
    case "volcano": {
      const puff = (i: number) => { const k = ((t * 0.25 + i / 4) % 1); return <circle key={i} cx={Math.sin(i * 2) * 60 + k * 120} cy={-1050 - k * 500} r={80 + k * 120} fill="#55505a" opacity={0.75 * (1 - k)} />; };
      return (
        <g>
          {[0, 1, 2, 3].map(puff)}
          <path d="M -800 0 L -160 -1000 L 160 -1000 L 800 0 Z" fill="#5a4a46" />
          <path d="M -500 0 L -160 -700 L -60 -1000 L 60 -1000 L 160 -700 L 500 0 Z" fill="#6b5a54" />
          <path d="M -160 -1000 Q 0 -1060 160 -1000 L 120 -980 Q 0 -1010 -120 -980 Z" fill="#ff7a1f" />
          {[-60, 20, 80].map((x, i) => <path key={x} d={`M ${x} -990 Q ${x + 30} -800 ${x - 20} ${-560 + i * 80} L ${x + 20} ${-560 + i * 80} Q ${x + 60} -800 ${x + 30} -990 Z`} fill="#ff5a1a" opacity={0.6 + 0.4 * Math.sin(t * 3 + i)} />)}
        </g>
      );
    }
    case "cloud": return (
      <g transform={`translate(0 ${Math.sin(t * 1.1) * 12})`} fill="#ffffff">
        <ellipse cx={0} cy={-60} rx={420} ry={90} /><circle cx={-200} cy={-120} r={120} /><circle cx={40} cy={-170} r={160} /><circle cx={250} cy={-110} r={110} />
      </g>
    );
    default: return null;
  }
};
