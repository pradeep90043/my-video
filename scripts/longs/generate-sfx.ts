#!/usr/bin/env tsx
/**
 * Synthesises the emotion sound effects with ffmpeg (no downloads, no licences)
 * into public/audio/sfx/<name>.mp3. Names match SFX_NAMES in src/stickman/schema.ts.
 *
 * Usage: npm run longform:sfx [-- --force]
 */
import * as fs from "fs";
import * as path from "path";
import { SFX_NAMES } from "../../src/stickman/schema";
import { fail, hasFlag, run } from "./util";

const OUT = path.join(process.cwd(), "public", "audio", "sfx");
const env = (d: number, a = 0.01) => `min(t/${a},1)*exp(-t*${(4 / d).toFixed(2)})`;
const tone = (f: string, d: number, extra = "1") => `sin(2*PI*(${f})*t)*${env(d)}*${extra}`;

/** lavfi aevalsrc expression + duration (s) per effect */
const RECIPES: Record<(typeof SFX_NAMES)[number], { expr: string; dur: number; filter?: string }> = {
  ding: { dur: 0.9, expr: `${tone("1318", 0.9)}*0.6+${tone("2637", 0.5)}*0.2` },
  tada: {
    dur: 1.4,
    expr: [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.3]]
      .map(([f, s]) => `if(gte(t,${s}),sin(2*PI*${f}*(t-${s}))*exp(-(t-${s})*3)*0.35,0)`).join("+"),
  },
  sad: {
    // sad trombone: 4 falling notes with vibrato on the last
    dur: 2.2,
    expr: [[311, 0, 0.45], [294, 0.5, 0.45], [277, 1.0, 0.45], [233, 1.5, 0.7]]
      .map(([f, s, d]) => `if(between(t,${s},${s + d}),(sin(2*PI*${f}*t*(1+0.012*sin(2*PI*6*t)))+0.5*sin(4*PI*${f}*t))*0.3*min((t-${s})/0.05,1)*min((${s + d}-t)/0.08,1),0)`).join("+"),
    filter: "lowpass=f=1800",
  },
  boom: { dur: 1.2, expr: `(sin(2*PI*(55-25*t)*t)*0.9+random(0)*0.25*exp(-t*14))*${env(1.2, 0.003)}`, filter: "lowpass=f=400,acompressor" },
  fail: {
    dur: 0.9,
    expr: `(if(between(t,0,0.35),1,0)+if(between(t,0.45,0.9),1,0))*(gt(sin(2*PI*110*t),0)*0.6-0.3)`,
    filter: "lowpass=f=900",
  },
  scratch: { dur: 0.55, expr: `(random(0)*2-1)*0.5*sin(PI*t/0.55)`, filter: "bandpass=f=1800:width_type=q:w=0.7,tremolo=f=18:d=0.7" },
  riser: { dur: 1.2, expr: `sin(2*PI*(220*t+600*t*t)*1.0)*0.35*min(t/1.0,1)*min((1.2-t)/0.1,1)` },
  // sharp inhale: noise swelling then cut
  gasp: { dur: 0.55, expr: `(random(0)*2-1)*0.7*pow(sin(PI*min(t/0.4,1)*0.5),2)*min((0.55-t)/0.05,1)`, filter: "highpass=f=500,lowpass=f=5000" },
  pop: { dur: 0.25, expr: `sin(2*PI*(600+900*exp(-t*30))*t)*${env(0.25, 0.002)}*0.8` },
};

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const force = hasFlag("force");
  for (const name of SFX_NAMES) {
    const file = path.join(OUT, `${name}.mp3`);
    if (!force && fs.existsSync(file)) continue;
    const r = RECIPES[name];
    const chain = [r.filter, "afade=t=out:st=" + (r.dur - 0.08).toFixed(2) + ":d=0.08", "volume=0.9"].filter(Boolean).join(",");
    const res = run("ffmpeg", [
      "-y", "-f", "lavfi", "-i", `aevalsrc='${r.expr}':s=44100:d=${r.dur}`,
      "-af", chain, "-c:a", "libmp3lame", "-b:a", "128k", file,
    ]);
    if (res.status !== 0) fail(`ffmpeg failed for ${name}:\n${res.stderr.split("\n").slice(-6).join("\n")}`);
    console.log(`  ♪ ${name}.mp3`);
  }
  console.log(`✅ SFX ready in public/audio/sfx/`);
}

main();
