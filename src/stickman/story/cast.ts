/** The storyboard template: a story has a CAST (people who look different) and every scene places some of them on a BACKGROUND. */
export const STORY_BGS = [
  "village", "forest", "home", "room_night", "school", "street", "market", "palace", "temple", "hospital",
  "river", "road", "office", "farm", "mountain", "beach",
  // finance and news looks
  "bank", "stock", "newsroom", "govt", "studio",
  // inside a body, a cave: where the story goes "inside"
  "belly", "cave",
] as const;

/** The frame around a story: plain storyboard, finance (header strip + figure card) or news (breaking badge + headline bar). */
export const STORY_LOOKS = ["story", "finance", "news"] as const;
export type StoryLook = (typeof STORY_LOOKS)[number];
export type StoryBgName = (typeof STORY_BGS)[number];

export const STORY_TIMES = ["day", "dusk", "night"] as const;
export type StoryTime = (typeof STORY_TIMES)[number];

export const CHAR_POSES = ["stand", "talk", "point", "wave", "sad", "happy", "angry", "scared", "walk", "think", "bow", "run", "cry", "pray", "hug", "give", "eat", "sleep", "dance", "fight", "carry", "struggle", "push", "shout", "tired", "jump"] as const;
/** poses that ARE the action (running, hugging, giving...): held for the whole beat, never replaced by talking gestures */
export const ACTION_POSES: readonly string[] = ["walk", "run", "cry", "pray", "hug", "give", "eat", "sleep", "dance", "fight", "carry", "struggle", "push", "shout", "tired", "jump"];
export type CharPose = (typeof CHAR_POSES)[number];

export const CHAR_MOODS = ["neutral", "happy", "sad", "angry", "scared", "surprised", "laugh", "worried"] as const;
export type CharMood = (typeof CHAR_MOODS)[number];

export const HAIR_STYLES = ["short", "side", "long", "bun", "ponytail", "bald", "curly", "turban", "cap"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const OUTFITS = ["shirt", "kurta", "saree", "dress", "uniform", "suit", "hoodie", "dhoti", "fur"] as const;
/** animal characters (fairy-tale animals that stand and talk like people): the fur colour is `skin` */
export const SPECIES = ["wolf", "fox", "lion", "tiger", "dog", "cat", "monkey", "rabbit", "bear", "elephant", "deer", "goat", "buffalo", "cow", "tortoise", "crow"] as const;
export type Species = (typeof SPECIES)[number];
export type Outfit = (typeof OUTFITS)[number];

export interface CastMember {
  id: string;
  /** shown under the character when it first appears */
  name?: string;
  age: "child" | "teen" | "adult" | "elder";
  skin: string;
  hair: HairStyle;
  hairColor: string;
  outfit: Outfit;
  /** main clothing colour; `outfit2` the trousers / pallu / second tone */
  color: string;
  color2?: string;
  glasses?: boolean;
  beard?: boolean;
  bindi?: boolean;
  /** an animal character: `skin` is its fur, `outfit` "fur" (or clothes for a dressed-up animal) */
  species?: Species;
  /** a drawn character (see puppet/spec.ts): used instead of the built-in people and animals */
  puppet?: import("./puppet/spec").PuppetSpec;
}

export const SKINS = ["#F3C9A0", "#E7B07F", "#D39A68", "#B9794A", "#8D5A3B", "#6B4128"] as const;

/** Used when a project gives no cast: the narrator and a friend, so a story still has two faces. */
export const DEFAULT_CAST: CastMember[] = [
  { id: "hero", name: "", age: "adult", skin: SKINS[2], hair: "short", hairColor: "#1B1B1B", outfit: "shirt", color: "#2E86DE", color2: "#2D3436" },
  { id: "friend", name: "", age: "adult", skin: SKINS[1], hair: "long", hairColor: "#2B1A12", outfit: "kurta", color: "#E84393", color2: "#2D3436" },
];

export interface StagedChar {
  id: string;
  /** horizontal position, 0-100 % of the frame width */
  x: number;
  pose: CharPose;
  mood: CharMood;
  flip: boolean;
  scale: number;
  /** frames before the character walks / pops in */
  delay: number;
  speaking: boolean;
  fromX?: number;
  /** an object in the character's hand (a gift being given, a book being read, food being eaten) */
  holds?: string;
  /** a short line shown in a speech bubble ("नहीं!") */
  says?: string;
  /** a head movement answering someone: no (shake), yes (nod), shrug, surprise, laugh */
  react?: string;
  /** what they do during the beat, in order: [{at: 0..1, pose}], each action springs into the next */
  acts?: { at: number; pose: string }[];
  /** the pose they had at the end of the previous beat (the first action eases out of it) */
  fromPose?: string;
}
