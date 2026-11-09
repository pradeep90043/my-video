import type { FlatVideoSpec } from "./spec";

/** A showreel for FLAT-VECTOR: every kind of shot, a mixed cast (myth, modern, school, office). Used by the Flat* compositions. */
export const FLAT_DEMO: FlatVideoSpec = {
  title: "Flat engine demo",
  characters: [
    { id: "king", name: "Raja Vikram", gender: "male", skin: "tan", hair: "long", hairColor: "#1d1410", headwear: "mukut", upper: "bare", lower: "dhoti", lowerColor: "#f3ead8", accent: "#e2a93b", accessories: ["necklace", "armlets", "earrings", "sash", "belt"], mark: "tilak", facial: "moustache" },
    { id: "sage", name: "Rishi", gender: "male", age: "old", skin: "wheat", hair: "jata", hairColor: "#f2efe9", upper: "bare", lower: "dhoti", lowerColor: "#efe3c8", accessories: ["sash"], accent: "#e8823a", mark: "tripundra", facial: "beard-long" },
    { id: "devi", gender: "female", skin: "fair", hair: "long", headwear: "tiara", upper: "blouse", upperColor: "#c0392b", lower: "saree", lowerColor: "#d63a52", accent: "#f2b53a", accessories: ["necklace", "earrings", "bangles"], mark: "bindi" },
    { id: "asura", gender: "male", build: "heavy", skin: "#3e5a3a", hair: "spiky", headwear: "horns", upper: "armor", upperColor: "#2d3530", lower: "dhoti", lowerColor: "#8f1d1d", accent: "#d9a23a", fangs: true, eyes: "glow", facial: "moustache", hairColor: "#141414" },
    { id: "shadow", gender: "male", build: "heavy", headwear: "horns", upper: "armor", lower: "dhoti", silhouette: true },
    { id: "riya", gender: "female", age: "adult", skin: "wheat", hair: "ponytail", upper: "shirt", upperColor: "#4f7cc4", lower: "pants", lowerColor: "#2f3a4a", accessories: ["watch"] },
    { id: "arjun", gender: "male", age: "teen", skin: "brown", hair: "spiky", upper: "hoodie", upperColor: "#e0702e", lower: "jeans", lowerColor: "#36598a", accessories: ["bag"] },
    { id: "doc", gender: "male", skin: "light", hair: "side-part", hairColor: "#5a3a26", upper: "coat", upperColor: "#f4f6f8", lower: "pants", lowerColor: "#3b4252", accessories: ["glasses"], facial: "stubble" },
  ] as any,
  shots: [
    { sec: 4, bg: "palace", fx: "dust", camera: "push", title: "A King Who Feared Nothing", cast: [{ id: "king", gesture: "hands-hips", mood: "happy", tag: { name: "Raja Vikram", sub: "King of Avanti" } }], caption: "Once there was a king who feared nothing." },
    { sec: 4, bg: "night", fx: "stars", camera: "push", title: "The Prophecy", graphic: { type: "compass", text: "S", title: "South" }, cast: [{ id: "sage", gesture: "wave", talking: true }, { id: "king", gesture: "think", mood: "scared" }], caption: "A sage pointed to the south." },
    { sec: 4, bg: "glow", palette: ["#8f1d1d"], fx: "embers", camera: "push", title: "The One We Fear", cast: [{ id: "shadow", gesture: "raise", enter: "rise", scale: 1.3 }], caption: "From the south came the one everyone feared." },
    { sec: 4, bg: "glow", palette: ["#5a1d6a"], fx: "rings", title: "Asura Mahadant", cast: [{ id: "asura", gesture: "attack", prop: "mace", mood: "evil", talking: true, tag: { name: "Mahadant", sub: "Lord of the South" } }], caption: "Mahadant, lord of the south." },
    { sec: 4, bg: "sunburst", fx: "sparkle", camera: "pull", title: "Then Came The Goddess", cast: [{ id: "devi", gesture: "bless", mood: "calm", enter: "pop", prop: "diya" }], caption: "Then the goddess appeared with a lamp." },
    { sec: 4, bg: "night", fx: "stars", title: "Four Days Left", graphic: { type: "calendar", items: ["1", "2", "3", "4"], subs: ["Prophecy", "", "", "Battle"], highlight: 3 }, caption: "He had only four days." },
    { sec: 3, bg: "plain", fx: "dust", graphic: { type: "date-card", text: "Kartik Amavasya", subs: ["Evening"] }, caption: "On the night of Kartik Amavasya..." },
    { sec: 4, bg: "temple", fx: "petals", title: "The Remedy", cast: [{ id: "king", gesture: "namaste", mood: "calm" }, { id: "sage", gesture: "talk", talking: true, say: "Light a lamp facing south!" }], caption: "Light a lamp facing south, said the sage." },
    { sec: 3, bg: "night", object: "diya", fx: "fireflies", caption: "One small lamp." },
    { sec: 4, bg: "night", title: "The Path", graphic: { type: "nodes", items: ["Lamp", "Prayer", "Safety"], subs: ["Yamdeep", "Faith", "Long life"], icons: ["diya", "flower", "heart"], highlight: 2 }, caption: "Lamp, prayer, protection." },
    { sec: 4, bg: "office", camera: "pan-right", title: "Same Idea, Today", cast: [{ id: "riya", gesture: "hold", prop: "phone", talking: true, mood: "happy", enter: "slide-left" }, { id: "doc", gesture: "point", look: "left" }], caption: "The same engine works for modern stories." },
    { sec: 4, bg: "classroom", title: "Exam Week", cast: [{ id: "arjun", gesture: "cry", mood: "sad", beats: [{ at: 2, gesture: "raise", mood: "happy" }] }], graphic: { type: "clock", value: 9 }, caption: "From panic to relief." },
    { sec: 4, bg: "plain", palette: ["#14213d", "#1d3557"], title: "By The Numbers", graphic: { type: "stat", value: 1250000, title: "lamps lit in one night" }, caption: "Twelve lakh fifty thousand lamps." },
    { sec: 4, bg: "plain", palette: ["#1b1b2f", "#2e2e4f"], title: "Remember", graphic: { type: "list", items: ["Light the lamp at dusk", "Face it to the south", "Pray for the family"], icons: ["diya", "compass" as any, "heart"] }, caption: "Three simple steps." },
    { sec: 3, bg: "plain", graphic: { type: "statement", text: "But there is more..." }, caption: "But there is more." },
  ] as any,
  captions: true,
};

/** Character sheet: everyone in the demo, side by side. */
export const FLAT_SHEET_SHOT = (ids: string[]) => ({
  bg: "plain", camera: "static", fx: "none",
  cast: ids.map((id, i) => ({ id, x: (i + 0.5) / ids.length, gesture: ["idle", "wave", "namaste", "attack", "raise", "hold", "talk", "point"][i % 8], mood: ["happy", "calm", "neutral", "evil", "neutral", "happy", "neutral", "neutral"][i % 8], enter: "none", prop: i === 5 ? "phone" : i === 3 ? "trident" : undefined })),
});
