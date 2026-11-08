import React, { useEffect, useState } from "react";
import { OffthreadVideo, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { PhotoSpec } from "./schema";
import type { Theme, World } from "./theme";
import { withDevanagari } from "./fonts";

/**
 * A full-screen "visual scene": a real photo or clip fills the frame (slow Ken-Burns move), the headline springs in, and the points
 * follow one after another as a flow of numbered chips joined by arrows. There is no stickman here. An AI picture is darkened
 * (`dim`) so the words carry the scene, and a scene with no picture at all is the same words on a coloured background.
 */

/** Words broken into at most `maxLines` lines of about `max` characters. */
export function wrapWords(text: string, max: number, maxLines = 3): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + " " + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = (keep[maxLines - 1] + " " + lines.slice(maxLines).join(" ")).trim();
    return keep;
  }
  return lines;
}

const useMedia = (src: string, video: boolean) => {
  const [handle] = useState(() => delayRender(`cinematic ${src || "no picture"}`, { timeoutInMilliseconds: 45000 }));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!src) { continueRender(handle); return; }
    if (video) { setOk(true); continueRender(handle); return; } // OffthreadVideo waits for its own frames
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (good: boolean) => { setOk(good); continueRender(handle); };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = src;
  }, [src, video, handle]);
  return ok;
};

export const CinematicScene: React.FC<{ spec: PhotoSpec; theme: Theme; accent: string; durationFrames: number; world: World; font: string }> = ({ spec, accent, durationFrames, world, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = world.width, H = world.height;
  const vertical = W < H;
  const src = !spec.url ? "" : /^https?:\/\//i.test(spec.url) ? spec.url : staticFile(spec.url);
  const ok = useMedia(src, spec.video);
  const hasMedia = ok && !!src;
  const family = withDevanagari(font);

  const t = frame / Math.max(1, durationFrames);
  const zoom = interpolate(t, [0, 1], [1.05, 1.2]);
  const panX = interpolate(t, [0, 1], [-18, 18]);
  const fade = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  // darker where the words sit; an AI picture gets a heavier cover
  const shade = spec.dim ? 0.62 : 0.38;

  const headline = (spec.headline ?? "").trim();
  const points = spec.points ?? [];
  const hSize = vertical ? 92 : 104;
  const hLines = wrapWords(headline, vertical ? 14 : 24, 3);
  const hSpring = spring({ frame: frame - 3, fps, config: { damping: 15, stiffness: 120, mass: 0.8 } });

  // the points are revealed across the narration, not all at once
  const first = 20;
  const n = points.length;
  const gap = Math.max(12, Math.min(34, Math.floor((durationFrames - first - 24) / Math.max(1, n))));

  const headTop = vertical ? 260 : 150;
  const headBottom = headTop + hLines.length * hSize * 1.08;

  const chipEls = points.map((p, i) => {
    const s = spring({ frame: frame - (first + i * gap), fps, config: { damping: 13, stiffness: 150, mass: 0.7 } });
    if (vertical) {
      const cw = W - 160, ch = 150, x = 80, y = Math.max(headBottom + 70, 620) + i * (ch + 54);
      const lines = wrapWords(p, 26, 2);
      return (
        <g key={i} opacity={Math.min(1, s * 2)} transform={`translate(${x},${y + (1 - s) * 40})`}>
          {i > 0 && <path d={`M${cw / 2 - 18},-40 L${cw / 2},-18 L${cw / 2 + 18},-40`} fill="none" stroke={accent} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />}
          <rect width={cw} height={ch} rx={28} fill="#0B0B0B" opacity={0.78} stroke={accent} strokeWidth={5} />
          <circle cx={60} cy={ch / 2} r={34} fill={accent} />
          <text x={60} y={ch / 2 + 14} textAnchor="middle" fontSize={40} fontWeight={900} fill="#0B0B0B" fontFamily={family}>{i + 1}</text>
          <text fontSize={lines.length > 1 ? 40 : 46} fontWeight={800} fill="#FFFFFF" fontFamily={family}>
            {lines.map((l, k) => <tspan key={k} x={118} y={ch / 2 + (lines.length > 1 ? -4 + k * 50 : 16)}>{l}</tspan>)}
          </text>
        </g>
      );
    }
    const gapX = 80, m = 110;
    const cw = (W - 2 * m - (n - 1) * gapX) / n, ch = 220;
    const x = m + i * (cw + gapX), y = Math.max(headBottom + 110, 600);
    const fs = n > 3 ? 42 : 48;
    const lines = wrapWords(p, Math.max(8, Math.floor((cw - 60) / (fs * 0.56))), 3);
    const lh = fs * 1.2;
    return (
      <g key={i} opacity={Math.min(1, s * 2)} transform={`translate(${x},${y + (1 - s) * 36})`}>
        {i > 0 && <path d={`M${-gapX + 14},${ch / 2} L${-14},${ch / 2} M${-34},${ch / 2 - 18} L${-14},${ch / 2} L${-34},${ch / 2 + 18}`} fill="none" stroke={accent} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />}
        <rect width={cw} height={ch} rx={30} fill="#0B0B0B" opacity={0.8} stroke={accent} strokeWidth={5} />
        <circle cx={cw / 2} cy={0} r={34} fill={accent} stroke="#0B0B0B" strokeWidth={6} />
        <text x={cw / 2} y={14} textAnchor="middle" fontSize={40} fontWeight={900} fill="#0B0B0B" fontFamily={family}>{i + 1}</text>
        <text fontSize={fs} fontWeight={800} fill="#FFFFFF" fontFamily={family} textAnchor="middle">
          {lines.map((l, k) => <tspan key={k} x={cw / 2} y={ch / 2 + fs * 0.35 - ((lines.length - 1) * lh) / 2 + 12 + k * lh}>{l}</tspan>)}
        </text>
      </g>
    );
  });

  return (
    <g opacity={fade}>
      <defs>
        <linearGradient id="cine-cover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity={shade + 0.15} />
          <stop offset="55%" stopColor="#000" stopOpacity={shade - 0.1} />
          <stop offset="100%" stopColor="#000" stopOpacity={shade + 0.3} />
        </linearGradient>
        <linearGradient id="cine-plain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#101828" />
          <stop offset="100%" stopColor={accent} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#cine-plain)" />
      {hasMedia && spec.video && (
        <foreignObject x={0} y={0} width={W} height={H}>
          <OffthreadVideo src={src} muted startFrom={Math.round(spec.startFrom * fps)} style={{ width: W, height: H, objectFit: "cover", transform: `scale(${zoom})` }} />
        </foreignObject>
      )}
      {hasMedia && !spec.video && (
        <image href={src} x={panX} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice"
          transform={`translate(${W / 2},${H / 2}) scale(${zoom}) translate(${-W / 2},${-H / 2})`} />
      )}
      <rect width={W} height={H} fill="url(#cine-cover)" opacity={hasMedia ? 1 : 0.35} />
      {hLines.length > 0 && (
        <g opacity={Math.min(1, hSpring * 2)} transform={`translate(0,${(1 - hSpring) * -50})`}>
          <rect x={vertical ? W / 2 - 120 : 110} y={headTop - hSize * 0.92} width={240 * hSpring} height={14} rx={7} fill={accent} />
          <text fontSize={hSize} fontWeight={900} fill="#FFFFFF" fontFamily={family} stroke="#000" strokeWidth={10} paintOrder="stroke" strokeLinejoin="round" letterSpacing={-1}
            textAnchor={vertical ? "middle" : "start"}>
            {hLines.map((l, k) => <tspan key={k} x={vertical ? W / 2 : 110} y={headTop + k * hSize * 1.08}>{l}</tspan>)}
          </text>
        </g>
      )}
      {chipEls}
    </g>
  );
};
