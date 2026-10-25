/**
 * What a character looks like, chosen by the story in words: age, gender, build, hair, beard, glasses, outfit, colours, skin.
 * The skeleton is the same for everyone (rig.ts), so the IK, sitting and reaching stay exact: age only scales the whole body and
 * enlarges the head, build widens the torso, and the rest is drawing (person.tsx).
 */
import { z } from "zod";

export const AGES = ["child", "teen", "adult", "old"] as const;
export const GENDERS = ["male", "female"] as const;
export const BUILDS = ["slim", "average", "heavy"] as const;
export const HAIRS = ["short", "spiky", "side-part", "long", "bun", "ponytail", "curly", "bald", "cap", "hijab"] as const;
export const BEARDS = ["none", "stubble", "beard", "mustache"] as const;
export const OUTFITS = ["shirt", "tshirt", "jacket", "uniform", "kurta", "dress", "saree"] as const;
export const SKINS = ["silhouette", "light", "medium", "tan", "dark"] as const;

export const AvatarSchema = z.object({
  age: z.enum(AGES).optional(),
  gender: z.enum(GENDERS).optional(),
  build: z.enum(BUILDS).optional(),
  hair: z.enum(HAIRS).optional(),
  hairColor: z.string().optional(),
  beard: z.enum(BEARDS).optional(),
  glasses: z.boolean().optional(),
  outfit: z.enum(OUTFITS).optional(),
  /** clothes: top (shirt / kurta / dress / saree) and bottom (trousers; the saree's border) */
  top: z.string().optional(),
  bottom: z.string().optional(),
  skin: z.enum(SKINS).optional(),
});
export type AvatarIn = z.infer<typeof AvatarSchema>;

export interface Avatar {
  age: (typeof AGES)[number]; gender: (typeof GENDERS)[number]; build: (typeof BUILDS)[number]; hair: (typeof HAIRS)[number];
  hairColor: string; beard: (typeof BEARDS)[number]; glasses: boolean; outfit: (typeof OUTFITS)[number];
  top: string; bottom?: string; skin: (typeof SKINS)[number];
}

/** the old three stock characters, as avatars */
const STOCK: Record<string, AvatarIn> = {
  student: { age: "teen", gender: "male", hair: "short" },
  customer: { age: "adult", gender: "male", hair: "side-part" },
  seller: { age: "adult", gender: "female", hair: "bun", glasses: true },
};

/** Fill in everything the story did not say. */
export function resolveAvatar(who: string | undefined, a: AvatarIn = {}, shirt?: string): Avatar {
  const s = { ...(STOCK[who ?? ""] ?? {}), ...stripUndef(a) };
  const gender = s.gender ?? "male", age = s.age ?? "adult";
  const skin = s.skin ?? "silhouette";
  const hair = s.hair ?? (gender === "female" ? (age === "old" ? "bun" : "long") : age === "old" ? "bald" : "short");
  return {
    age, gender, build: s.build ?? "average", hair,
    hairColor: s.hairColor ?? (hair === "cap" ? "#b8322f" : hair === "hijab" ? "#4a5a7a" : age === "old" ? "#d8d8d4" : skin === "silhouette" ? "#16161a" : "#1e1915"),
    beard: s.beard ?? "none", glasses: s.glasses ?? false,
    outfit: s.outfit ?? "shirt",
    top: s.top ?? shirt ?? "#3e6fa8",
    // silhouettes keep black legs unless the story names trousers; drawn skin needs clothes
    bottom: s.bottom ?? (skin === "silhouette" ? undefined : "#2b3142"),
    skin,
  };
}
const stripUndef = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** How big the whole body is (multiplies the row scale) and how big the head is on it. */
export const SIZE: Record<Avatar["age"], { body: number; head: number; eyes: number }> = {
  child: { body: 0.66, head: 1.3, eyes: 1.18 },
  teen: { body: 0.92, head: 1.06, eyes: 1.05 },
  adult: { body: 1, head: 1, eyes: 1 },
  old: { body: 0.96, head: 1, eyes: 0.95 },
};
export const bodyScale = (av: Avatar) => SIZE[av.age].body * (av.gender === "female" && av.age !== "child" ? 0.96 : 1);

export const SKIN_FILL: Record<Avatar["skin"], string> = { silhouette: "url(#fl-sil)", light: "#f0c8a2", medium: "#d6a06c", tan: "#b47b4c", dark: "#6c4429" };
