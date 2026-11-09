import horse from "./examples/horse.json";
import king from "./examples/king.json";
import person from "./examples/person.json";
import type { PuppetSpec } from "./spec";

/** Hand-checked drawings the story engine can use by name (the planner may only ask for these mounts). */
export const MOUNTS: Record<string, PuppetSpec> = { horse: horse as unknown as PuppetSpec };

/** A rider in the colours of a cast member: crowned when the member is a king / queen, plain otherwise. */
export function riderFor(m: { skin: string; color: string; color2?: string; crown?: boolean }): PuppetSpec {
  const base = (m.crown ? king : person) as unknown as PuppetSpec;
  return { ...base, palette: { ...base.palette, skin: m.skin, robe: m.color, robeD: m.color, pants: m.color2 ?? base.palette.pants } };
}
