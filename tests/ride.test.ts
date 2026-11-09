import assert from "assert";
import horse from "../src/stickman/story/puppet/examples/horse.json";
import king from "../src/stickman/story/puppet/examples/king.json";
import { boneAngle, channelsFor } from "../src/stickman/story/puppet/animate";
import { validatePuppet, type PuppetSpec } from "../src/stickman/story/puppet/spec";

const h = horse as unknown as PuppetSpec, k = king as unknown as PuppetSpec;
assert.deepStrictEqual(validatePuppet(h), [], "horse valid");
assert.deepStrictEqual(validatePuppet(k), [], "king valid");
assert.ok(validatePuppet({ ...h, seat: { bone: "nope", at: [0, 0] } }).length, "a seat on a missing bone is rejected");

const leg = (id: string) => h.bones.find((b) => b.id === id)!;
// gallop: fore legs move together, hind legs together and a little later; a plain walk keeps diagonal pairs opposite
const g = channelsFor("run", { frame: 7, gallop: true });
assert.strictEqual(g.gallop, 1);
assert.ok(Math.abs(boneAngle(leg("legFF"), g) - boneAngle(leg("legFN"), g)) < 1e-6, "both fore legs swing the same");
const w = channelsFor("walk", { frame: 7, gallop: true });
assert.strictEqual(w.gallop, 0, "walking is not a gallop");
assert.notStrictEqual(boneAngle(leg("legFF"), w), boneAngle(leg("legFN"), w), "walk keeps opposite diagonal legs");
// a plain run of a creature without `gallop` is unchanged
assert.strictEqual(channelsFor("run", { frame: 7 }).gallop, 0);
// a seated rider's thighs point forward, shins down
const s = channelsFor("stand", { frame: 3, seated: true });
assert.ok(boneAngle(k.bones.find((b) => b.id === "legN")!, s) < -60 && boneAngle(k.bones.find((b) => b.id === "legNL")!, s) > 60);
console.log("✓ ride: gallop, seat, rider legs");
