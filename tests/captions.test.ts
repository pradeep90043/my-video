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
