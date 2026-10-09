import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStickmanScenes } from "../src/stickman/schema";

const news = { outlet: "Reuters", date: "Oct 8, 2026", headline: "US halts green card applications", mark: "halts", stamp: "Alleged" };

test("news panel: valid clipping passes", () => {
  assert.deepEqual(validateStickmanScenes([{ id: "a", visual: { news } }]), []);
});

test("news panel: needs outlet and headline, counts as a panel", () => {
  assert.ok(validateStickmanScenes([{ id: "a", visual: { news: { outlet: "", headline: "x" } } }]).length > 0);
  assert.ok(validateStickmanScenes([{ id: "a", visual: { news: { outlet: "R", headline: "" } } }]).length > 0);
  assert.ok(validateStickmanScenes([{ id: "a", visual: { news, alert: { kind: "error", title: "x" } } }]).some((p) => p.includes("only one panel")));
});
