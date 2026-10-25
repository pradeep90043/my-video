#!/usr/bin/env tsx
/**
 * Builds the realism sound library from recorded CC0 / public-domain clips:
 *   public/audio/ambient/<name>.mp3   seamless loops (wind, rain, city, …), mastered quiet
 *   public/audio/foley/<name>.mp3     one-shots (footsteps, doors, alarm, …), peak-normalised
 *   public/audio/SOUND_LICENSES.md    where every clip came from
 * Sources: Kenney (CC0, kenney.nl) and Wikimedia Commons files tagged CC0 / Public domain.
 * Raw downloads are cached in .cache/sounds/, so re-runs only fetch what is missing.
 * The mastered mp3s are committed; CI and the runner never need the network for this.
 *
 * Usage: npm run longform:sounds [-- --force] [-- --only rain,stairs]
 */
import * as fs from "fs";
import * as path from "path";
import { AMBIENT_NAMES, FOLEY_NAMES, type AmbientName, type FoleyName } from "../../src/stickman/sounds";
import { fail, getArg, hasFlag, probeDuration, run, sleep } from "./util";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".cache", "sounds");
const OUT = path.join(ROOT, "public", "audio");
const UA = "codeorcap-sounds/1.0 (video pipeline; CC0 sound library builder)";

type Pack = "impact" | "rpg" | "iface";

/** Where a clip comes from. */
type Src =
  | { kenney: Pack; file: string }
  | { commons: string }
  | { synth: string };

/** One-shot recipe. `steps` builds a walking pattern out of several recorded footfalls. */
interface FoleySpec {
  src?: Src;
  /** several recorded takes laid out at `interval` seconds (with a little timing jitter) */
  steps?: { takes: Src[]; count: number; interval: number };
  /** start offset / max length in seconds of the source clip */
  ss?: number;
  t?: number;
  /** extra ffmpeg audio filters */
  af?: string;
}
interface AmbientSpec {
  src: Src;
  ss?: number;
  /** length of the loop before the seam crossfade (default 30 s) */
  t?: number;
  af?: string;
}

const K = (file: string, pack: Pack = "impact"): Src => ({ kenney: pack, file });
const takes = (prefix: string, n = 5): Src[] => Array.from({ length: n }, (_, i) => K(`${prefix}_00${i}.ogg`));

const AMBIENT: Record<AmbientName, AmbientSpec> = {
  wind: { src: { commons: "Windy breath.ogg" }, t: 18 },
  // darker, quieter wind under a night scene
  night: { src: { commons: "Windy breath.ogg" }, t: 18, af: "lowpass=f=700,volume=0.8" },
  forest: { src: { commons: "Gentle breeze and birds singing.ogg" }, t: 30 },
  rain: { src: { commons: "Rain.ogg" }, t: 9 },
  storm: { src: { commons: "Rain and thunder.ogg" }, t: 18 },
  "rain-window": { src: { commons: "Rain against the window.ogg" }, ss: 5, t: 40 },
  city: { src: { commons: "Sunday in the city street noise1.ogg" }, ss: 20, t: 45 },
  cafe: { src: { commons: "Restaurant ambience.ogg" }, ss: 5, t: 45 },
  crowd: { src: { commons: "Shopping mall less crowded.ogg" }, t: 28 },
  // no recording needed: brown noise is what room tone is
  room: { src: { synth: "anoisesrc=color=brown:amplitude=0.5:d=20:r=44100" }, t: 18, af: "lowpass=f=420,highpass=f=40" },
};

const FOLEY: Record<FoleyName, FoleySpec> = {
  footsteps: { steps: { takes: takes("footstep_concrete"), count: 8, interval: 0.55 } },
  "footsteps-wood": { steps: { takes: takes("footstep_wood"), count: 8, interval: 0.55 } },
  "footsteps-grass": { steps: { takes: takes("footstep_grass"), count: 8, interval: 0.6 } },
  "footsteps-carpet": { steps: { takes: takes("footstep_carpet"), count: 8, interval: 0.55 } },
  run: { steps: { takes: takes("footstep_concrete"), count: 14, interval: 0.26 } },
  // quicker, lighter wooden steps with a hollow thump on each
  stairs: { steps: { takes: takes("footstep_wood"), count: 10, interval: 0.4 }, af: "equalizer=f=140:t=q:w=1:g=4" },
  "door-open": { src: K("doorOpen_1.ogg", "rpg") },
  "door-close": { src: K("doorClose_1.ogg", "rpg") },
  "door-creak": { src: K("creak1.ogg", "rpg") },
  knock: { src: { commons: "Knocking on wood or door.ogg" }, t: 3 },
  alarm: { src: { commons: "Alarm Clock (Directory.Audio).mp3" }, t: 5 },
  "smoke-alarm": { src: { commons: "Smoke alarm.ogg" }, t: 5 },
  siren: { src: { commons: "American police siren i.ogg" }, t: 6 },
  "clock-tick": { steps: { takes: [K("tick_001.ogg", "iface"), K("tick_002.ogg", "iface")], count: 6, interval: 1 }, af: "equalizer=f=1800:t=q:w=1:g=3" },
  typing: { src: { commons: "Typing - Model M 1986.ogg" }, t: 6 },
  "typing-soft": { src: { commons: "Soft laptop keyboard-wxA-2.wav" }, t: 6 },
  click: { src: K("metalClick.ogg", "rpg") },
  glass: { src: K("impactGlass_light_001.ogg") },
  "book-flip": { src: K("bookFlip2.ogg", "rpg") },
  cloth: { src: K("cloth3.ogg", "rpg") },
  punch: { src: K("impactPunch_medium_001.ogg") },
  thud: { src: K("impactSoft_heavy_002.ogg") },
  clang: { src: K("impactPlate_heavy_001.ogg") },
  bell: { src: K("impactBell_heavy_001.ogg") },
  applause: { src: { commons: "Sound Effects - Applause after a concert.ogg" }, ss: 1, t: 6 },
  laughter: { src: { commons: "Laughter(s).ogg" }, t: 5 },
  // snake / sibilant: filtered noise with a fast tremolo
  hiss: { src: { synth: "anoisesrc=d=1.6:c=white:r=44100:a=0.9" }, af: "highpass=f=3500,lowpass=f=9500,tremolo=f=22:d=0.35,afade=t=in:d=0.25,afade=t=out:st=0.9:d=0.7" },
  // two short buzzes of a phone on a table
  "phone-buzz": { src: { synth: "aevalsrc='sin(2*PI*180*t)*(0.6+0.4*sin(2*PI*40*t))':d=1.6:s=44100" }, af: "volume='clip(8*(0.32-mod(t,0.8)),0,1)*clip(40*mod(t,0.8),0,1)':eval=frame,lowpass=f=900" },
  // lub-dub, 66 bpm; a harmonic keeps it audible on phone speakers
  heartbeat: { src: { synth: "aevalsrc='0.7*sin(2*PI*55*t)+0.5*sin(2*PI*110*t)':d=6:s=44100" }, af: "volume='max(exp(-14*mod(t,0.9)),0.7*gte(mod(t,0.9),0.28)*exp(-14*(mod(t,0.9)-0.28))):eval=frame',lowpass=f=240" },
  // slow breathing of someone asleep: soft noise swelling every 3.4 s
  breath: { src: { synth: "anoisesrc=color=pink:amplitude=0.8:d=10.2:r=44100" }, af: "highpass=f=250,lowpass=f=1800,volume='0.15+0.85*pow(0.5+0.5*sin(2*PI*t/3.4-1.57),2)':eval=frame" },
  sigh: { src: { synth: "anoisesrc=color=pink:amplitude=0.8:d=1.8:r=44100" }, af: "highpass=f=300,lowpass=f=2400,volume='pow(sin(PI*t/1.8),2)':eval=frame" },
  whoosh: { src: { synth: "anoisesrc=color=white:amplitude=0.8:d=0.8:r=44100" }, af: "highpass=f=300,lowpass=f=4000,volume='pow(sin(PI*t/0.8),1.5)':eval=frame" },
  // turning over in bed / shifting clothes
  rustle: { steps: { takes: ["cloth1.ogg", "cloth2.ogg", "cloth3.ogg", "cloth4.ogg"].map((f) => K(f, "rpg")), count: 6, interval: 0.45 } },
  "bat-hit": { src: K("impactPlank_medium_001.ogg") },
  // digital phone alarm: four beeps, a pause, four beeps
  "phone-alarm": { src: { synth: "aevalsrc='0.6*sin(2*PI*1760*t)+0.3*sin(2*PI*880*t)':d=2.4:s=44100" }, af: "volume='lt(mod(t,1.2),0.76)*clip(40*(0.1-mod(t,0.19)),0,1)*clip(60*mod(t,0.19),0,1)':eval=frame" },
  // a marker squeaking across paper
  "marker-write": { src: { synth: "anoisesrc=color=white:d=0.6:r=44100:a=0.7" }, af: "highpass=f=1800,lowpass=f=4500,tremolo=f=34:d=0.9,volume='pow(sin(PI*t/0.6),0.7)':eval=frame" },
  // paper being scrunched: crackly bursts
  "paper-crumple": { src: { synth: "anoisesrc=color=white:d=1.4:r=44100:a=0.8" }, af: "highpass=f=1200,volume='abs(sin(t*61))*abs(sin(t*37+1))*pow(sin(PI*t/1.4),0.6)*2':eval=frame" },
  // shop door bell: three bright partials decaying together
  "shop-bell": { src: { synth: "aevalsrc='(0.5*sin(2*PI*2637*t)+0.35*sin(2*PI*3951*t)+0.25*sin(2*PI*1318*t))*exp(-4*t)':d=1.6:s=44100" } },
  "ball-bounce": { steps: { takes: ["000", "001", "002", "003", "004"].map((n) => K(`impactSoft_medium_${n}.ogg`)), count: 6, interval: 0.42 }, af: "volume='exp(-0.9*t)':eval=frame" },
};

// ───────────────────────────── downloads ─────────────────────────────

const licenses = new Map<string, { source: string; licence: string; url: string }>();
const srcKey = (s: Src) => ("kenney" in s ? `kenney:${s.kenney}/${s.file}` : "commons" in s ? `commons:${s.commons}` : `synth:${s.synth}`);

async function http(url: string, as: "json" | "buffer"): Promise<any> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      const wait = 15_000 * attempt;
      console.warn(`     … ${res.status} from ${new URL(url).host}, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return as === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`gave up on ${url}`);
}

async function kenneyDir(pack: Pack): Promise<string> {
  const dir = path.join(CACHE, "kenney", pack);
  if (fs.existsSync(path.join(dir, "Audio"))) return dir;
  const slug = { impact: "impact-sounds", rpg: "rpg-audio", iface: "interface-sounds" }[pack];
  const page = (await http(`https://kenney.nl/assets/${slug}`, "buffer")).toString("utf-8");
  const zip = /https:\/\/kenney\.nl\/media\/pages\/assets\/[^"]+\.zip/.exec(page)?.[0];
  if (!zip) throw new Error(`no download link for Kenney ${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  const zipFile = path.join(dir, "pack.zip");
  fs.writeFileSync(zipFile, await http(zip, "buffer"));
  const r = run("unzip", ["-qo", zipFile, "-d", dir]);
  if (r.status !== 0) throw new Error(`unzip failed: ${r.stderr}`);
  return dir;
}

let lastCommons = 0;
async function commonsFile(title: string): Promise<string> {
  const file = path.join(CACHE, "commons", title.replace(/[^\w.()-]+/g, "_"));
  const q = new URLSearchParams({ action: "query", titles: `File:${title}`, prop: "imageinfo", iiprop: "url|extmetadata", format: "json" });
  // the metadata call is cheap and always made: it re-checks the licence and feeds SOUND_LICENSES.md
  const info = await http(`https://commons.wikimedia.org/w/api.php?${q}`, "json");
  const ii = (Object.values(info.query.pages)[0] as any)?.imageinfo?.[0];
  if (!ii) throw new Error(`Commons has no file "${title}"`);
  const licence: string = ii.extmetadata?.LicenseShortName?.value ?? "";
  if (!/CC0|public domain/i.test(licence)) throw new Error(`"${title}" is licensed "${licence}", not CC0/public domain`);
  licenses.set(`commons:${title}`, { source: `Wikimedia Commons — ${title}`, licence, url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replace(/ /g, "_"))}` });
  if (!fs.existsSync(file)) {
    const wait = lastCommons + 5000 - Date.now(); // stay well under Wikimedia's rate limit
    if (wait > 0) await sleep(wait);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, await http(ii.url, "buffer"));
    lastCommons = Date.now();
  }
  return file;
}

async function resolve(s: Src): Promise<{ args: string[] }> {
  if ("synth" in s) return { args: ["-f", "lavfi", "-i", s.synth] };
  if ("kenney" in s) {
    const f = path.join(await kenneyDir(s.kenney), "Audio", s.file);
    if (!fs.existsSync(f)) throw new Error(`Kenney ${s.kenney} has no ${s.file}`);
    licenses.set(srcKey(s), { source: `Kenney ${{ impact: "Impact Sounds", rpg: "RPG Audio", iface: "Interface Sounds" }[s.kenney]} — ${s.file}`, licence: "CC0", url: "https://kenney.nl/assets" });
    return { args: ["-i", f] };
  }
  return { args: ["-i", await commonsFile(s.commons)] };
}

// ───────────────────────────── mastering ─────────────────────────────

function ff(args: string[], label: string) {
  const r = run("ffmpeg", ["-y", "-v", "error", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${label}:\n${r.stderr.split("\n").slice(-6).join("\n")}`);
}

/** mean/max level (dB) of a file, from volumedetect */
function levels(file: string): { mean: number; max: number } {
  const r = run("ffmpeg", ["-v", "info", "-i", file, "-af", "volumedetect", "-f", "null", "-"]);
  const mean = /mean_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1];
  const max = /max_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1];
  if (!mean || !max) throw new Error(`volumedetect gave nothing for ${file}`);
  return { mean: parseFloat(mean), max: parseFloat(max) };
}

const MP3 = ["-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k"];
const SEAM = 2; // seconds of crossfade that make the loop seamless

async function buildAmbient(name: AmbientName, spec: AmbientSpec, tmp: string) {
  const inp = await resolve(spec.src);
  const len = spec.t ?? 30;
  const cut = path.join(tmp, `${name}.wav`);
  // 1. cut the window, tame rumble, optional colouring
  ff([...(spec.ss ? ["-ss", String(spec.ss)] : []), ...inp.args, "-t", String(len), "-af", ["highpass=f=50", spec.af].filter(Boolean).join(","), "-ac", "2", "-ar", "44100", cut], name);
  const d = probeDuration(cut);
  const x = Math.min(SEAM, d / 4);
  // 2. loop seam: middle + (tail crossfaded into head), so the file's end flows straight into its start
  const looped = path.join(tmp, `${name}.loop.wav`);
  ff(
    ["-i", cut, "-filter_complex",
      `[0]asplit=3[a][b][c];[a]atrim=${x}:${d - x},asetpts=PTS-STARTPTS[mid];[b]atrim=${d - x}:${d},asetpts=PTS-STARTPTS[tail];[c]atrim=0:${x},asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=${x}[seam];[mid][seam]concat=n=2:v=0:a=1`,
      looped],
    name,
  );
  // 3. master: ambient beds sit at a mean level of -30 dB so 1.0 gain is already "under the voice"
  const gain = -30 - levels(looped).mean;
  ff(["-i", looped, "-af", `volume=${gain.toFixed(1)}dB,alimiter=limit=0.7`, ...MP3, path.join(OUT, "ambient", `${name}.mp3`)], name);
}

async function buildFoley(name: FoleyName, spec: FoleySpec, tmp: string) {
  const raw = path.join(tmp, `${name}.wav`);
  const trim = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02";
  if (spec.steps) {
    const { takes: ts, count, interval } = spec.steps;
    const inputs: string[] = [];
    const delays: string[] = [];
    for (let i = 0; i < count; i++) {
      inputs.push(...(await resolve(ts[(i * 2) % ts.length])).args); // 0,2,4,1,3 — never the same take twice running
      const jitter = ((i * 37) % 11 - 5) * 0.006; // ±30 ms, deterministic
      const ms = Math.max(0, Math.round((i * interval + jitter) * 1000));
      // alternate left/right foot: a slight level difference keeps it from sounding sampled
      delays.push(`[${i}]${trim},volume=${i % 2 ? 0.85 : 1},adelay=${ms}|${ms}[s${i}]`);
    }
    ff([...inputs, "-filter_complex", `${delays.join(";")};${Array.from({ length: count }, (_, i) => `[s${i}]`).join("")}amix=inputs=${count}:normalize=0:dropout_transition=0${spec.af ? `,${spec.af}` : ""}`, "-ac", "2", "-ar", "44100", raw], name);
  } else {
    const inp = await resolve(spec.src!);
    ff([...(spec.ss ? ["-ss", String(spec.ss)] : []), ...inp.args, ...(spec.t ? ["-t", String(spec.t)] : []), "-af", [trim, spec.af, "highpass=f=40"].filter(Boolean).join(","), "-ac", "2", "-ar", "44100", raw], name);
  }
  const d = probeDuration(raw);
  // peak to -6 dB, short fade-out so cut-offs never click
  const gain = -6 - levels(raw).max;
  ff(["-i", raw, "-af", `volume=${gain.toFixed(1)}dB,afade=t=out:st=${Math.max(0, d - 0.08).toFixed(2)}:d=0.08`, ...MP3, path.join(OUT, "foley", `${name}.mp3`)], name);
}

// ───────────────────────────── main ─────────────────────────────

async function main() {
  const force = hasFlag("force");
  const only = getArg("only")?.split(",").map((s) => s.trim());
  fs.mkdirSync(path.join(OUT, "ambient"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "foley"), { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(CACHE, "build-"));

  const failures: string[] = [];
  const jobs: { kind: "ambient" | "foley"; name: string; fn: () => Promise<void> }[] = [
    ...AMBIENT_NAMES.map((n) => ({ kind: "ambient" as const, name: n, fn: () => buildAmbient(n, AMBIENT[n], tmp) })),
    ...FOLEY_NAMES.map((n) => ({ kind: "foley" as const, name: n, fn: () => buildFoley(n, FOLEY[n], tmp) })),
  ];
  for (const j of jobs) {
    if (only && !only.includes(j.name)) continue;
    const target = path.join(OUT, j.kind, `${j.name}.mp3`);
    if (!force && !only && fs.existsSync(target)) continue;
    try {
      await j.fn();
      console.log(`  ♪ ${j.kind}/${j.name}.mp3  (${probeDuration(target).toFixed(1)}s)`);
    } catch (e) {
      failures.push(`${j.kind}/${j.name}: ${e instanceof Error ? e.message : e}`);
      console.error(`  ✗ ${j.kind}/${j.name}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  writeLicenses();
  if (failures.length) fail(`${failures.length} sound(s) failed:\n  ${failures.join("\n  ")}`);
  console.log("✅ Sound library ready in public/audio/{ambient,foley}/");
}

/** Credits file. Merges with what is already there so partial runs (--only) don't drop other entries. */
function writeLicenses() {
  const file = path.join(OUT, "SOUND_LICENSES.md");
  const rows = new Map<string, string>();
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
      const m = /^\| `([^`]+)` \|/.exec(line);
      if (m) rows.set(m[1], line);
    }
  }
  const origins = (src?: Src[]) => (src ?? []).map((s) => licenses.get(srcKey(s))).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const add = (id: string, srcs: Src[]) => {
    const o = origins(srcs);
    if (!o.length) return;
    const uniq = [...new Map(o.map((x) => [x.source, x])).values()];
    rows.set(id, `| \`${id}\` | ${uniq.map((u) => `[${u.source}](${u.url})`).join("<br>")} | ${[...new Set(uniq.map((u) => u.licence))].join(", ")} |`);
  };
  for (const n of AMBIENT_NAMES) add(`ambient/${n}`, [AMBIENT[n].src]);
  for (const n of FOLEY_NAMES) add(`foley/${n}`, FOLEY[n].steps?.takes ?? [FOLEY[n].src!]);
  const body = [...rows.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, l]) => l);
  fs.writeFileSync(
    file,
    [
      "# Sound credits",
      "",
      "Every clip in `ambient/` and `foley/` is CC0 or public domain (no attribution required; listed here anyway).",
      "Rebuilt by `npm run longform:sounds` — do not edit by hand.",
      "",
      "| file | source | licence |",
      "|---|---|---|",
      ...body,
      "",
    ].join("\n"),
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
