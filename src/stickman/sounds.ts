/**
 * Realism sound library for the stickman videos: looping ambient beds and one-shot foley.
 * Recorded CC0 / public-domain clips are fetched and mastered by `npm run longform:sounds`
 * into public/audio/ambient/<name>.mp3 and public/audio/foley/<name>.mp3 (credits: public/audio/SOUND_LICENSES.md).
 * Pure data + text rules (no React, no node) so the composition, scripts and tests share them.
 */

export const AMBIENT_NAMES = ["wind", "night", "forest", "rain", "storm", "rain-window", "city", "cafe", "crowd", "room"] as const;
export const FOLEY_NAMES = [
  "footsteps", "footsteps-wood", "footsteps-grass", "footsteps-carpet", "run", "stairs",
  "door-open", "door-close", "door-creak", "knock",
  "alarm", "smoke-alarm", "siren", "clock-tick",
  "typing", "typing-soft", "click", "glass", "book-flip", "cloth",
  "punch", "thud", "clang", "bell", "applause", "laughter", "hiss",
] as const;

export type AmbientName = (typeof AMBIENT_NAMES)[number];
export type FoleyName = (typeof FOLEY_NAMES)[number];

/** Default mix gain (0..1) on top of the mastered file level; ambient files sit ≈ 15 dB under the voice at 1.0. */
export const AMBIENT_GAIN: Record<AmbientName, number> = {
  wind: 0.5, night: 0.5, forest: 0.55, rain: 0.5, storm: 0.55, "rain-window": 0.5, city: 0.5, cafe: 0.5, crowd: 0.5, room: 0.4,
};
export const FOLEY_GAIN: Record<FoleyName, number> = {
  footsteps: 0.5, "footsteps-wood": 0.5, "footsteps-grass": 0.5, "footsteps-carpet": 0.55, run: 0.5, stairs: 0.5,
  "door-open": 0.6, "door-close": 0.6, "door-creak": 0.5, knock: 0.6,
  alarm: 0.45, "smoke-alarm": 0.35, siren: 0.35, "clock-tick": 0.4,
  typing: 0.45, "typing-soft": 0.5, click: 0.5, glass: 0.55, "book-flip": 0.55, cloth: 0.5,
  punch: 0.6, thud: 0.6, clang: 0.5, bell: 0.45, applause: 0.4, laughter: 0.4, hiss: 0.5,
};

/** Sample `at` positions in the spoken text → frames: a rule fires on the first word matching `word`. */
interface FoleyRule { foley: FoleyName; word: RegExp }
interface AmbientRule { ambient: AmbientName; test: RegExp }

/** First match wins. Whole-word, lower-cased; a few Hindi / Hinglish cues so Devanagari scripts also work. */
export const AMBIENT_RULES: AmbientRule[] = [
  { ambient: "storm", test: /\b(thunder|thunderstorm|storm|lightning)\b|तूफ़?ान|bijli/i },
  { ambient: "rain", test: /\b(rain|raining|rainy|rainfall|drizzle|monsoon)\b|बारिश|barish/i },
  { ambient: "wind", test: /\b(wind|windy|breeze|gust|gusts|howling)\b|हवा|hawa/i },
  { ambient: "cafe", test: /\b(cafe|café|restaurant|canteen)\b|कैफ़े/i },
  { ambient: "city", test: /\b(city|traffic|street|streets|highway|honking)\b|शहर|sadak/i },
  { ambient: "crowd", test: /\b(crowd|crowded|mall|festival)\b|भीड़|bheed/i },
  { ambient: "forest", test: /\b(forest|jungle|woods|birds|chirping)\b|जंगल|junglee/i },
  { ambient: "night", test: /\b(midnight|night|nights|3am|2am)\b|रात|raat/i },
];

const FOLEY_RULES: FoleyRule[] = [
  { foley: "stairs", word: /^(stairs|staircase|upstairs|downstairs)$|^seedhi/i },
  { foley: "run", word: /^(sprinted|rushed|rushing|hurried|raced|dashed)$|^दौड़/i },
  { foley: "footsteps", word: /^(walked|footsteps|footstep|stepped|tiptoed|strolled)$|^kadam/i },
  { foley: "knock", word: /^(knock|knocked|knocking|knocks)$|^दस्तक/i },
  { foley: "door-close", word: /^(slammed|slam|slams)$/i },
  { foley: "door-open", word: /^(door|doors|darwaza|दरवाज़ा|दरवाजा)$/i },
  { foley: "alarm", word: /^(alarm|alarms)$|^अलार्म/i },
  { foley: "siren", word: /^(siren|sirens|ambulance)$/i },
  { foley: "typing", word: /^(keyboard|keystrokes)$/i },
  { foley: "clock-tick", word: /^(ticking|tick-tock|ticktock|countdown)$/i },
  { foley: "applause", word: /^(applause|clapped|clapping|cheered|cheering)$/i },
  { foley: "laughter", word: /^(laughed|laughing|laughter|giggled|chuckled)$|^हंस/i },
  { foley: "glass", word: /^(glass|cheers|toast)$/i },
  { foley: "punch", word: /^(punched|punch|slapped|slap|smashed)$/i },
  { foley: "bell", word: /^(bell|bells)$/i },
];

export interface FoleyCue { foley: FoleyName; wordIndex: number }

/** Ambient bed implied by a scene's narration, or undefined when nothing in the text suggests one. */
export function detectAmbient(text: string): AmbientName | undefined {
  return AMBIENT_RULES.find((r) => r.test.test(text))?.ambient;
}

/** Foley cues implied by the narration words (at most `max`, one per sound, in spoken order). */
export function detectFoley(words: string[], max = 2): FoleyCue[] {
  const cues: FoleyCue[] = [];
  const bare = words.map((w) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""));
  // a "door" next to "closed"/"shut" is a closing door, not an opening one
  const closing = bare.some((w) => /^(closed|closes|closing|shut)$/.test(w));
  for (let i = 0; i < bare.length && cues.length < max; i++) {
    const rule = FOLEY_RULES.find((r) => r.word.test(bare[i]));
    if (!rule) continue;
    const foley: FoleyName = rule.foley === "door-open" && closing ? "door-close" : rule.foley;
    if (cues.some((c) => c.foley === foley)) continue;
    cues.push({ foley, wordIndex: i });
  }
  return cues;
}
