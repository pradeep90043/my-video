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
  // body and object sounds that the animation itself triggers (see actionSounds.ts)
  "phone-buzz", "heartbeat", "breath", "sigh", "whoosh", "rustle", "bat-hit", "ball-bounce",
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
  "phone-buzz": 0.45, heartbeat: 0.5, breath: 0.35, sigh: 0.4, whoosh: 0.4, rustle: 0.45, "bat-hit": 0.6, "ball-bounce": 0.5,
};

/**
 * Layered ambience: what a place sounds like is a close bed plus a distant one (a bedroom is room tone with the night
 * outside; a street is traffic with wind). `layers` lists the extra beds under whatever the scene's main bed is.
 */
export interface AmbientLayer { name: AmbientName; gain: number }
const PLACE_LAYERS: Record<string, AmbientLayer[]> = {
  room_night: [{ name: "room", gain: 0.5 }, { name: "night", gain: 0.3 }],
  home: [{ name: "room", gain: 0.5 }, { name: "city", gain: 0.1 }],
  school: [{ name: "crowd", gain: 0.4 }, { name: "room", gain: 0.2 }],
  street: [{ name: "city", gain: 0.5 }, { name: "wind", gain: 0.15 }],
  market: [{ name: "crowd", gain: 0.5 }, { name: "city", gain: 0.2 }],
  road: [{ name: "wind", gain: 0.3 }, { name: "city", gain: 0.25 }],
  village: [{ name: "forest", gain: 0.4 }, { name: "wind", gain: 0.15 }],
  forest: [{ name: "forest", gain: 0.5 }, { name: "wind", gain: 0.15 }],
  farm: [{ name: "forest", gain: 0.4 }, { name: "wind", gain: 0.2 }],
  river: [{ name: "wind", gain: 0.3 }, { name: "forest", gain: 0.3 }],
  mountain: [{ name: "wind", gain: 0.5 }, { name: "forest", gain: 0.15 }],
  beach: [{ name: "wind", gain: 0.4 }, { name: "crowd", gain: 0.1 }],
  office: [{ name: "room", gain: 0.4 }, { name: "cafe", gain: 0.12 }],
  hospital: [{ name: "room", gain: 0.45 }, { name: "crowd", gain: 0.08 }],
  palace: [{ name: "room", gain: 0.4 }, { name: "wind", gain: 0.12 }],
  temple: [{ name: "wind", gain: 0.25 }, { name: "room", gain: 0.3 }],
  cave: [{ name: "wind", gain: 0.3 }, { name: "room", gain: 0.5 }],
};
/** The extra beds a story scene wants: its place, plus rain when it rains and the night outside after dark. */
export function placeLayers(bg: string, time: string, fx: string): AmbientLayer[] {
  const out = [...(PLACE_LAYERS[bg] ?? [{ name: "room" as const, gain: 0.4 }])];
  const has = (n: AmbientName) => out.some((l) => l.name === n);
  if ((fx === "rain" || fx === "lightning") && !has("rain")) out.push({ name: "rain", gain: 0.5 });
  if (time === "night" && !has("night") && bg !== "room_night") out.push({ name: "night", gain: 0.3 });
  return out;
}

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
