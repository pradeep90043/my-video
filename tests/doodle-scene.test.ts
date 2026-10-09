import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSET_DRAW, resolveTint } from "../src/stickman/doodle/assets";
import { ASSET_KEYWORDS, SCENE_ASSETS, SCENE_BACKGROUNDS } from "../src/stickman/doodle/catalog";
import { PANEL_KEYS, StickmanVisualSchema, validateStickmanScenes } from "../src/stickman/schema";

test("every catalogue asset has a drawing, and every drawing is in the catalogue", () => {
  assert.deepEqual(Object.keys(ASSET_DRAW).sort(), [...SCENE_ASSETS].sort());
  for (const name of SCENE_ASSETS) assert.ok(ASSET_DRAW[name](resolveTint(undefined, name)), `${name} draws something`);
});

test("every asset has keywords, all lower case", () => {
  for (const [name, words] of Object.entries(ASSET_KEYWORDS)) {
    assert.ok(words.length > 0, `${name} has keywords`);
    for (const w of words) assert.equal(w, w.toLowerCase(), `${name}: "${w}" must be lower case`);
  }
});

test("scene panel: valid specs parse with defaults, bad ones are reported", () => {
  const ok = StickmanVisualSchema.parse({ scene: { items: [{ asset: "server", x: 20, y: 50 }, { asset: "drop", x: 80, y: 50, label: "Water", tint: "blue" }], arrows: [{ from: [30, 50], to: [70, 50] }] } });
  assert.equal(ok.scene?.background, "paper");
  assert.equal(ok.scene?.items[0].size, 34);
  assert.ok(PANEL_KEYS.includes("scene"));
  assert.deepEqual(validateStickmanScenes([{ id: "s1", visual: { scene: { background: SCENE_BACKGROUNDS[1], items: [{ asset: "city", x: 50, y: 50 }] } } }]), []);
  const bad = validateStickmanScenes([
    { id: "a", visual: { scene: { items: [{ asset: "dragon", x: 1, y: 1 }] } } },
    { id: "b", visual: { scene: { items: [{ asset: "server", x: 150, y: 1 }] } } },
    { id: "c", visual: { scene: { items: [] } } },
    { id: "d", visual: { scene: { items: [{ asset: "server", x: 1, y: 1 }] }, flow: { nodes: ["a", "b"] } } },
  ]);
  assert.equal(bad.filter((p) => /scene a|scene b|scene c/.test(p)).length >= 3, true);
  assert.ok(bad.some((p) => p.startsWith("scene d") && p.includes("only one panel")));
});
