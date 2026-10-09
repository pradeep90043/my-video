import React from "react";
import { Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/** [startFrame, endFrame] in which the voice is speaking. */
export type SpeechWindow = [number, number];

interface TimedScene {
  startFrame?: number;
  durationFrames?: number;
  duration?: number;
  pauseBefore?: number;
}

/** Speech windows from scene timing (startFrame + pauseBefore .. + duration), so no audio analysis is needed. */
export function speechWindows(scenes: TimedScene[], fps: number): SpeechWindow[] {
  return scenes.map((sc) => {
    const pause = Math.round((sc.pauseBefore ?? 0) * fps);
    const a = (sc.startFrame ?? 0) + pause;
    const len = sc.duration !== undefined ? Math.round(sc.duration * fps) : (sc.durationFrames ?? 150) - pause;
    return [a, a + Math.max(1, len)];
  });
}

/**
 * Background music that ducks under the voice. `volume` is the level under speech; the bed swells
 * to ~2.2x in pauses. It fades in/out over 1.2 s at section edges (1 s in / 2 s out at the very
 * start/end of the video), so consecutive sections crossfade. Render inside a <Sequence from={from}>.
 */
export const MusicBed: React.FC<{ windows: SpeechWindow[]; volume: number; src: string; from: number; to: number; first: boolean; last: boolean }> = ({ windows, volume, src, from, to, first, last }) => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = from + local;
  const attack = Math.round(fps * 0.25);
  const release = Math.round(fps * 0.7);
  let level = 1; // 1 = open (no speech), 0 = fully ducked
  for (const [a, b] of windows) {
    if (frame < a - attack || frame > b + release) continue;
    level = Math.min(level, interpolate(frame, [a - attack, a, b, b + release], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  const gain = volume * (1 + 1.2 * level);
  const len = to - from;
  const inLen = Math.round(fps * (first ? 1 : 1.2));
  const outLen = Math.round(fps * (last ? 2 : 1.2));
  const fade = interpolate(local, [0, inLen, Math.max(inLen + 1, len - outLen), len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // a plain number, not a (frame) callback: with `loop` the callback frame restarts every loop iteration and would break the ducking
  // eslint-disable-next-line @remotion/volume-callback
  return <Audio src={staticFile(src)} volume={Math.max(0, Math.min(1, gain * fade))} loop />;
};

/** One ducked music bed for a whole video: drop-in replacement for `<Audio src=music volume loop />`. */
export const DuckedMusic: React.FC<{ scenes: TimedScene[]; volume: number; src?: string }> = ({ scenes, volume, src }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!src) return null; // no bundled default: the old one matched a commercial song
  return (
    <Sequence durationInFrames={durationInFrames} name="music">
      <MusicBed windows={speechWindows(scenes, fps)} volume={volume} src={src} from={0} to={durationInFrames} first last />
    </Sequence>
  );
};
