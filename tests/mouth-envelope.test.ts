import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMouthLevels } from "../scripts/longs/mouth-envelope";

const RATE = 16000;
const FPS = 30;

/** `secs` of a 200 Hz tone at `amp`. */
const tone = (secs: number, amp: number): number[] =>
  Array.from({ length: Math.round(secs * RATE) }, (_, i) => amp * Math.sin((2 * Math.PI * 200 * i) / RATE));

test("one level per video frame", () => {
  const levels = computeMouthLevels(Float32Array.from(tone(2, 0.5)), RATE, FPS);
  assert.equal(levels.length, 60);
});

test("silence keeps the mouth closed, speech opens it", () => {
  const samples = Float32Array.from([...tone(1, 0.5), ...new Array(RATE).fill(0), ...tone(1, 0.5)]);
  const levels = computeMouthLevels(samples, RATE, FPS);
  assert.ok(levels.slice(5, 25).every((l) => l > 0.8), "loud section is open");
  assert.ok(levels.slice(40, 58).every((l) => l < 0.05), "silent section is closed (after release)");
  assert.ok(levels.slice(65, 85).every((l) => l > 0.8), "mouth reopens when speech resumes");
});

test("quiet background noise does not move the mouth", () => {
  const samples = Float32Array.from([...tone(1, 0.5), ...tone(1, 0.002)]);
  const levels = computeMouthLevels(samples, RATE, FPS);
  assert.ok(levels.slice(40, 60).every((l) => l < 0.05));
});

test("all-silent audio gives an all-closed mouth", () => {
  const levels = computeMouthLevels(new Float32Array(RATE), RATE, FPS);
  assert.ok(levels.length > 0 && levels.every((l) => l === 0));
});

test("levels stay within 0..1", () => {
  const levels = computeMouthLevels(Float32Array.from(tone(1, 1)), RATE, FPS);
  assert.ok(levels.every((l) => l >= 0 && l <= 1));
});
