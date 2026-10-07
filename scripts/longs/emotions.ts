/**
 * Emotion → voice mapping for edge-tts. edge-tts only exposes rate / pitch /
 * volume (no SSML styles), so each mood is a prosody preset that is *added* to
 * the project's base rate/pitch. A scene's explicit rate/pitch still wins.
 */
import type { Mood } from "../../src/stickman/schema";

interface Prosody { rate: number; pitch: number; volume: number }

export const MOOD_PROSODY: Record<Mood, Prosody> = {
  neutral:  { rate: 0,   pitch: 0,   volume: 0 },
  happy:    { rate: 6,   pitch: 10,  volume: 0 },
  excited:  { rate: 14,  pitch: 22,  volume: 10 },
  shocked:  { rate: 8,   pitch: 28,  volume: 15 },
  worried:  { rate: -4,  pitch: 8,   volume: -5 },
  confused: { rate: -4,  pitch: 12,  volume: 0 },
  sad:      { rate: -14, pitch: -14, volume: -15 },
  crying:   { rate: -18, pitch: -8,  volume: -10 },
  angry:    { rate: 10,  pitch: -6,  volume: 20 },
  smug:     { rate: -8,  pitch: -8,  volume: 0 },
};

const sign = (n: number) => (n >= 0 ? "+" : "-");

function parse(v: string | undefined, unit: "%" | "Hz"): number {
  const m = v && new RegExp(`^([+-]\\d+)${unit}$`).exec(v);
  return m ? parseInt(m[1], 10) : 0;
}

export interface Voice { rate: string; pitch: string; volume: string }

/** Final TTS settings for a scene: base + mood preset, unless the scene overrides rate/pitch itself. */
export function voiceForScene(
  mood: Mood | undefined,
  base: { rate: string; pitch: string },
  override: { rate?: string; pitch?: string; volume?: string },
): Voice {
  const p = MOOD_PROSODY[mood ?? "neutral"] ?? MOOD_PROSODY.neutral;
  const rate = override.rate ?? `${sign(parse(base.rate, "%") + p.rate)}${Math.abs(parse(base.rate, "%") + p.rate)}%`;
  const pitch = override.pitch ?? `${sign(parse(base.pitch, "Hz") + p.pitch)}${Math.abs(parse(base.pitch, "Hz") + p.pitch)}Hz`;
  const volume = override.volume ?? `${sign(p.volume)}${Math.abs(p.volume)}%`;
  return { rate, pitch, volume };
}
