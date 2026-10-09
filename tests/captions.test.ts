import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaptions } from "../src/stickman/captions";

test("chunks are non-empty, ordered, and fit inside the scene", () => {
  const text = "Har dusra video bol raha hai — AI ab programmers ki jagah le lega. Lekin kya ye sach hai? Chalo dekhte hain.";
  const chunks = buildCaptions(text, 200);
  assert.ok(chunks.length >= 3);
  let prevEnd = 0;
  for (const c of chunks) {
    assert.ok(c.text.length > 0);
    assert.ok(c.start >= prevEnd, "chunks must not overlap");
    assert.ok(c.end > c.start);
    prevEnd = c.end;
  }
  assert.ok(prevEnd <= 200);
});

test("no chunk exceeds maxWords and words are preserved in order", () => {
  const text = "one two three four five six seven eight nine ten eleven twelve thirteen";
  const chunks = buildCaptions(text, 300, 5);
  for (const c of chunks) assert.ok(c.text.split(" ").length <= 5);
  assert.equal(chunks.map((c) => c.text).join(" "), text);
});

test("single short sentence yields one chunk", () => {
  assert.equal(buildCaptions("Hello there", 60).length, 1);
});

test("real word timings drive chunk and word timing, dashes ride along", () => {
  const spoken = [
    { text: "Har", start: 0.1, end: 0.35 }, { text: "dusra", start: 0.4, end: 0.9 },
    { text: "video", start: 0.9, end: 1.3 }, { text: "bol", start: 1.3, end: 1.6 },
  ];
  const chunks = buildCaptions("Har dusra video bol —", 90, 7, spoken, 30);
  assert.equal(chunks.length, 1);
  const w = chunks[0].words;
  assert.equal(w.length, 5);
  assert.equal(w[1].start, 12); // 0.4s * 30
  assert.equal(w[4].start, w[4].end); // the dash has no time of its own
});

test("falls back to proportional timing when word counts differ", () => {
  const chunks = buildCaptions("Har dusra video", 60, 7, [{ text: "x", start: 0, end: 1 }], 30);
  assert.equal(chunks[0].words.length, 3);
});
