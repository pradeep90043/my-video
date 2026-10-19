import React, { useEffect, useState } from "react";
import { continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PhotoSpec } from "./schema";
import type { Theme } from "./theme";
import { PANEL } from "./PanelGeometry";

/**
 * A real licensed photo in a rounded card with a slow Ken-Burns move and its credit line. The image is preloaded under
 * delayRender so a frame is never rendered before the picture arrives; a picture that cannot load is skipped (the card
 * shows the credit on a plain background) instead of failing the whole render.
 */
export const PhotoPanel: React.FC<{ spec: PhotoSpec; theme: Theme; accent: string; durationFrames: number }> = ({ spec, theme, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [handle] = useState(() => delayRender(`photo ${spec.url}`, { timeoutInMilliseconds: 45000 }));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (good: boolean) => { setOk(good); continueRender(handle); };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = spec.url;
  }, [spec.url, handle]);

  const enter = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 110, mass: 0.7 } });
  const t = frame / Math.max(1, durationFrames);
  const zoom = interpolate(t, [0, 1], [1.04, 1.16]);
  const panX = interpolate(t, [0, 1], [-14, 14]);
  const W = PANEL.w, H = PANEL.h;
  const credit = `${spec.credit}${spec.license ? ` · ${spec.license}` : ""}`;
  return (
    <g transform={`translate(${PANEL.x},${PANEL.y + (1 - enter) * 40})`} opacity={Math.min(1, enter * 2)}>
      <defs><clipPath id="photo-card-clip"><rect width={W} height={H} rx={40} /></clipPath></defs>
      <g clipPath="url(#photo-card-clip)">
        <rect width={W} height={H} fill={theme.bg} />
        {ok && (
          <image href={spec.url} x={panX} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice"
            transform={`translate(${W / 2},${H / 2}) scale(${zoom}) translate(${-W / 2},${-H / 2})`} />
        )}
        {spec.caption && (
          <>
            <rect x={0} y={H - 150} width={W} height={110} fill="#000000" opacity={0.55} />
            <text x={W / 2} y={H - 78} textAnchor="middle" fontSize={46} fontWeight={800} fill="#FFFFFF" fontFamily="Montserrat, Arial, sans-serif">{spec.caption}</text>
          </>
        )}
        <rect x={0} y={H - 40} width={W} height={40} fill="#000000" opacity={0.7} />
        <text x={18} y={H - 12} fontSize={26} fill="#FFFFFF" fontFamily="Arial, sans-serif">{credit}</text>
      </g>
      <rect width={W} height={H} rx={40} fill="none" stroke={theme.ink} strokeWidth={8} />
    </g>
  );
};
