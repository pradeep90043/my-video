import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { verifyStamp, writeStamp } from "../scripts/shared/qa-stamp";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stamp-"));
const mk = (name: string, body = "video-bytes") => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, body);
  return f;
};
const info = { draft: false, width: 1280, height: 720, warnings: [] };

test("stamped file verifies", () => {
  const f = mk("ok.mp4");
  writeStamp(f, info);
  assert.equal(verifyStamp(f).ok, true);
});

test("file without a stamp is refused", () => {
  const r = verifyStamp(mk("none.mp4"));
  assert.equal(r.ok, false);
});

test("file modified after QA is refused", () => {
  const f = mk("changed.mp4");
  writeStamp(f, info);
  fs.writeFileSync(f, "re-encoded with different bytes");
  const r = verifyStamp(f);
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /changed/);
});

test("draft renders are refused", () => {
  const f = mk("draft.mp4");
  writeStamp(f, { ...info, draft: true });
  const r = verifyStamp(f);
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /draft/);
});
