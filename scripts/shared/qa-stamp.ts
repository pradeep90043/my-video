/**
 * QA stamp: a sidecar `<video>.qa.json` written by the render step once a file
 * has passed the QA gate. publish.ts refuses files without a valid stamp, so a
 * draft, half-written or failed render can never be uploaded by accident.
 * The stamp is bound to the file's size and mtime — re-encoding invalidates it.
 */

import * as fs from "fs";

export interface QaStamp {
  passed: boolean;
  draft: boolean;
  width: number;
  height: number;
  size: number;
  mtimeMs: number;
  warnings: string[];
  at: string;
}

export const stampPath = (video: string) => `${video}.qa.json`;

export function writeStamp(
  video: string,
  info: { draft: boolean; width: number; height: number; warnings: string[] },
): void {
  const st = fs.statSync(video);
  const stamp: QaStamp = { passed: true, ...info, size: st.size, mtimeMs: st.mtimeMs, at: new Date().toISOString() };
  fs.writeFileSync(stampPath(video), JSON.stringify(stamp, null, 2));
}

export function verifyStamp(video: string): { ok: true; stamp: QaStamp } | { ok: false; reason: string } {
  const sp = stampPath(video);
  if (!fs.existsSync(sp)) return { ok: false, reason: "no QA stamp (not rendered by the long-form pipeline, or QA never ran)" };
  let stamp: QaStamp;
  try {
    stamp = JSON.parse(fs.readFileSync(sp, "utf-8"));
  } catch {
    return { ok: false, reason: "QA stamp is unreadable" };
  }
  const st = fs.statSync(video);
  if (st.size !== stamp.size || Math.abs(st.mtimeMs - stamp.mtimeMs) > 1) {
    return { ok: false, reason: "file changed after it passed QA" };
  }
  if (!stamp.passed) return { ok: false, reason: "QA did not pass" };
  if (stamp.draft) return { ok: false, reason: "this is a draft render" };
  return { ok: true, stamp };
}
