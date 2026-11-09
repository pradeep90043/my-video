import type { FlatVideoSpec } from "./spec";

/** FLAT-VECTOR v2 showreel: framing, postures, animal heads, animals and riders, crowds, set pieces, storm, flood, map. */
export const FLAT_DEMO2: FlatVideoSpec = {
  title: "Flat engine v2 demo",
  characters: [
    { id: "krishna", name: "कृष्ण", gender: "male", age: "teen", skin: "#3b6fd1", hair: "long", headwear: "krishna-mukut", upper: "bare", lower: "dhoti", lowerColor: "#f2c14e", accent: "#e2a93b", accessories: ["garland", "armlets", "earrings", "bangles", "necklace"], mark: "namam" },
    { id: "shiva", name: "महादेव", gender: "male", skin: "#8fb3d9", hair: "jata", hairColor: "#3a2a20", headwear: "moon-jata", upper: "bare", lower: "dhoti", lowerColor: "#e9e2d0", accent: "#c9a15a", accessories: ["snake", "rudraksha", "armlets"], mark: "tripundra", eyes: "closed" },
    { id: "parvati", name: "पार्वती", gender: "female", skin: "fair", hair: "long", headwear: "crown", upper: "blouse", upperColor: "#e09b2d", lower: "saree", lowerColor: "#c0392b", accessories: ["necklace", "earrings", "bangles"], mark: "bindi" },
    { id: "ganesha", name: "गणेश", gender: "male", build: "heavy", head: "elephant", skin: "#f0a98c", headwear: "mukut", upper: "bare", lower: "dhoti", lowerColor: "#f2c14e", accent: "#e2a93b", accessories: ["necklace", "armlets", "sash"], mark: "tilak" },
    { id: "hanuman", name: "हनुमान", gender: "male", head: "monkey", skin: "#d9822e", headwear: "crown", upper: "bare", lower: "dhoti", lowerColor: "#d14b2a", accent: "#f2b53a", accessories: ["necklace", "armlets"], mark: "tilak" },
    { id: "indra", name: "इंद्र", gender: "male", skin: "wheat", hair: "long", headwear: "mukut", upper: "armor", upperColor: "#c9952f", lower: "dhoti", lowerColor: "#f3ead8", accent: "#e2a93b", accessories: ["necklace", "earrings"], facial: "moustache" },
    { id: "sage", name: "ऋषि", gender: "male", age: "old", skin: "wheat", hair: "jata", hairColor: "#f2efe9", upper: "bare", lower: "dhoti", lowerColor: "#efe3c8", accessories: ["sash", "rudraksha"], accent: "#e8823a", mark: "tripundra", facial: "beard-long" },
    { id: "ram", name: "राम", gender: "male", skin: "#4a7fd4", hair: "long", headwear: "mukut", upper: "bare", lower: "dhoti", lowerColor: "#f2c14e", accessories: ["necklace", "armlets", "sash"], mark: "namam" },
  ] as any,
  shots: [
    { sec: 5, bg: "village", fx: "storm", title: "गोवर्धन पर्वत", cast: [{ id: "krishna", gesture: "lift", mood: "calm", tag: { name: "कृष्ण", sub: "7 साल के" } }], set: [{ kind: "hill", x: 0.5, scale: 0.9, lift: 0.36, front: false }], crowd: 10, animals: [{ kind: "cow", x: 0.15, scale: 0.7 }, { kind: "cow", x: 0.88, scale: 0.6, flip: true }] },
    { sec: 4, bg: "mountains", palette: [], fx: "snow", title: "कैलाश पर महादेव", cast: [{ id: "shiva", posture: "meditate", gesture: "meditate", mood: "calm" }] },
    { sec: 4, bg: "palace", fx: "sparkle", cast: [{ id: "ganesha", posture: "seated", gesture: "bless", mood: "happy", talking: true, tag: { name: "गणेश" } }], set: [{ kind: "throne", x: 0.5, scale: 1 }], animals: [{ kind: "mouse", x: 0.78, scale: 1.4 }] },
    { sec: 4, bg: "sky", fx: "clouds", title: "ऐरावत पर इंद्र", animals: [{ kind: "elephant", x: 0.45, scale: 0.8, color: "#eef0f2" }], cast: [{ id: "indra", posture: "ride", rides: 0, gesture: "hold-up", prop: "trident", mood: "angry" }] },
    { sec: 4, bg: "glow", palette: ["#5a1d2a"], fx: "embers", framing: "close", cast: [{ id: "parvati", gesture: "cry", mood: "sad" }] },
    { sec: 4, bg: "forest", fx: "fireflies", framing: "medium", cast: [{ id: "hanuman", gesture: "namaste", mood: "happy", talking: true, say: "जय श्री राम!" }, { id: "ram", gesture: "bless", mood: "calm" }] },
    { sec: 4, bg: "village", fx: "flood", title: "सात दिन, सात रातें", crowd: 8, animals: [{ kind: "cow", x: 0.5, scale: 0.6 }] },
    { sec: 4, bg: "plain", palette: ["#1d2547", "#2c1d47"], title: "अयोध्या से लंका", graphic: { type: "map", items: ["अयोध्या", "लंका"], icons: ["bow"] } },
    { sec: 4, bg: "temple", fx: "embers", title: "पुत्रकामेष्टि यज्ञ", set: [{ kind: "yagya", x: 0.5, scale: 0.8, front: true }], cast: [{ id: "sage", posture: "sit", gesture: "talk", talking: true, x: 0.22 }, { id: "sage", posture: "sit", gesture: "namaste", x: 0.78 }] },
    { sec: 4, bg: "forest", fx: "dust", title: "वन के प्राणी", animals: [{ kind: "deer", x: 0.25, scale: 0.7 }, { kind: "peacock", x: 0.7, scale: 0.9 }, { kind: "lion", x: 1.2, moveTo: 0.85, scale: 0.6, flip: true }, { kind: "snake", x: 0.5, scale: 0.8 }] },
    { sec: 4, bg: "sea", fx: "none", set: [{ kind: "boat", x: 0.5, scale: 0.8 }], animals: [{ kind: "bird", x: 0.3, scale: 1.2 }] },
    { sec: 4, bg: "city", fx: "dust", set: [{ kind: "chariot", x: 0.45, scale: 0.8 }], animals: [{ kind: "horse", x: 0.88, scale: 0.65 }, { kind: "dog", x: 0.12, scale: 0.7 }] },
  ] as any,
  captions: false,
};
