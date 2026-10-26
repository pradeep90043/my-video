#!/usr/bin/env tsx
/**
 * An LLM writes a short film as director shots — places, cast, props, actions, camera, all in words — and every shot is checked
 * by the director itself before it is accepted. A shot that does not parse, or that the director has to warn about ("no chair to
 * sit on", "hands full"), goes back to the LLM with the exact complaint until it is clean.
 *
 *   tsx scripts/film/plan-film.ts --idea "a boy who keeps snoozing his alarm learns to study one minute a day" \
 *        --seconds 60 --out shots.json [--build my-film]
 *
 * LLM endpoint as in scripts/puppet/plan-story.ts (PUPPET_LLM_URL/PUPPET_LLM_KEY/PUPPET_MODEL, or FreeLLMAPI).
 */
import * as fs from "fs";
import { spawnSync } from "child_process";
import { ShotSchema, catalog, direct } from "../../src/stickman/film/direct";
import { extractJson } from "../../src/stickman/story/puppet/generate";

const args = process.argv.slice(2);
const opt = (n: string, d?: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const idea = opt("idea"), out = opt("out", "shots.json")!, seconds = Number(opt("seconds", "60")), build = opt("build");
if (!idea) { console.error('usage: --idea "..." [--seconds 60] [--out shots.json] [--build slug]'); process.exit(1); }
const chatUrl = process.env.PUPPET_LLM_URL || `${(process.env.FREELLMAPI_URL || "http://localhost:3001").replace(/\/$/, "")}/v1/chat/completions`;
const key = process.env.PUPPET_LLM_KEY ?? process.env.FREELLMAPI_KEY ?? "";

async function ask(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(chatUrl, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.PUPPET_MODEL || "auto", temperature: 0.6, max_tokens: 12000, messages }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`LLM answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as any;
  if (process.env.PLAN_DEBUG) console.log(`  [${j.model}] finish=${j.choices?.[0]?.finish_reason}`);
  return j.choices?.[0]?.message?.content ?? "";
}

const EXAMPLE = {
  secs: 6, place: "study", time: "night",
  props: [{ id: "laptop", kind: "laptop", on: "desk", at: 0.4 }, { id: "phone", kind: "phone", on: "desk", at: 0.1 }],
  cast: [{ id: "aman", age: "teen", gender: "male", hair: "spiky", outfit: "tshirt", top: "#3e6fa8", bottom: "#2b3142", skin: "medium", enter: "left", at: 0.2, mood: "tired" }],
  actions: [
    { at: 1.6, who: "aman", do: "sit", target: "chair" },
    { at: 2.8, who: "aman", do: "use", target: "laptop", dur: 2 },
    { at: 4.2, who: "aman", do: "think", text: "Just five minutes..." },
  ],
  camera: { shot: "wide", move: "push-in" },
};

const brief = `You are a film director writing a ${seconds}-second animated short film with NO narration: the story must be clear from what people do, their poses and moods, and a few short captions. Output ONLY JSON: { "title": "...", "shots": [ ... ] }. No prose, no code fences.

STORY IDEA: ${idea}

Each shot is described in words — never coordinates. The engine places everything physically (things stand on surfaces, people sit on seats, hands reach what they pick up) and frames the camera.

SHOT FIELDS
- secs: 2-8. Total of all shots ≈ ${seconds}. Use 10-20 shots. Vary camera: an establishing "wide", then "medium"/"close" on the person, "detail" on an important object.
- place, time ("day"|"dusk"|"night"|"rain"), optional furnish:false to start with an empty room.
- props: [{ id, kind, on, at, label?, lit?, color? }] — "on" is "floor", "wall", or the id of a thing with a surface (e.g. "desk", "bed", "counter", "nightstand"). The place's own furniture already exists with the ids listed below: refer to it, don't re-add it.
- cast: [{ id, at: 0-1, row?: "back"|"mid"|"front", facing?, mood, sitOn?, lieOn?, holds?, enter?: "left"|"right", + how they look: age, gender, build, hair, hairColor?, beard?, glasses?, outfit, top: "#hex", bottom?: "#hex", skin }].
  Design every character to fit the story (a grandmother: age "old", gender "female", hair "bun", outfit "saree"; a schoolboy: age "child", outfit "uniform"...). Use one skin style for the whole film ("silhouette" for the dark cinematic look, or a skin tone). Repeat EXACTLY the same look fields for a character in every shot.
- actions: [{ at: seconds into the shot, who, do, target?, to?, spot?, pose?, mood?, text?, dur? }]
    walk/run (target: a prop or person id, or to: 0-1 / "left" / "right"), enter, exit, sit (target a seat), stand, lie / sleep (target a bed or sofa), wake,
    pick (target a small thing), put (target a surface id, spot 0-1), give (target a person; must be holding something),
    use (laptop, phone, book: typing/reading), write (notebook, whiteboard, paper), press, switch (turn a lamp/tv/laptop on or off, open a door),
    look / face (target; "camera" turns the face to the audience until their next action), pose (pose, optional dur), mood (mood), say / think (text, ≤ 8 words; "say" may target the person spoken to),
    jump (dur = how long to keep jumping), dance (dur), clap (dur), kneel, pray, hug (target a person), fall (falls backwards, drops what is held; "stand" gets up), drink / eat (target a cup, bottle, glass, food: picked up first if not held), nod, shake (head), point / wave (target), bow.
  Faces follow the activity on their own: side-on while walking, working or talking to someone, eyes on what the hands do. Use "camera" only for a moment that speaks to the viewer.
  A person can only pick when the hands are free, put/give only when holding. Actions of one person happen in order; leave time for walking.
- camera: { shot: "wide"|"full"|"medium"|"close"|"detail", on: id or [ids], move: "static"|"push-in"|"pull-out"|"pan-left"|"pan-right"|"follow", feel?: "steady"|"handheld" }
  The camera follows people who move by itself and shakes on falls and slams by itself; use feel "handheld" for tense, intimate or emotional shots.
- captions: [{ text, at, style: "title"|"speech"|"whisper" }] (optional), title: big title card text (use with place "black"), fx: ["rain","dust","leaves","sunrays","glow"], fadeIn/fadeOut seconds.

VOCABULARY (use only these words)
${catalog()}

EXAMPLE SHOT
${JSON.stringify(EXAMPLE)}

Tell the story with a clear beginning, a problem that repeats, a turning point and an ending; end with a title card shot (place "black", title).`;

function check(raw: unknown): { shots: unknown[]; problems: string[]; title?: string } {
  const obj = raw as { title?: string; shots?: unknown[] };
  const shots = Array.isArray(raw) ? raw : obj?.shots;
  if (!Array.isArray(shots) || !shots.length) return { shots: [], problems: ["the answer has no shots array"] };
  const problems: string[] = [];
  shots.forEach((s, i) => {
    const p = ShotSchema.safeParse(s);
    if (!p.success) { problems.push(...p.error.issues.slice(0, 6).map((x) => `shot ${i}: ${x.path.join(".")}: ${x.message}`)); return; }
    for (const w of direct(p.data).warnings) problems.push(`shot ${i}: ${w}`);
  });
  const total = shots.reduce((a: number, s: any) => a + (Number(s?.secs) || 0), 0);
  if (Math.abs(total - seconds) > seconds * 0.25) problems.push(`the shots add up to ${total.toFixed(0)} s, the film should be about ${seconds} s`);
  return { shots, problems, title: Array.isArray(raw) ? undefined : obj.title };
}

(async () => {
  const messages = [{ role: "user", content: brief }];
  let best: ReturnType<typeof check> | undefined;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const text = await ask(messages);
    let parsed: unknown;
    try { parsed = extractJson(text); } catch (e) { console.warn(`  attempt ${attempt}: not JSON (${(e as Error).message})`); messages.push({ role: "assistant", content: text.slice(0, 4000) }, { role: "user", content: "That was not valid JSON. Output ONLY the JSON object." }); continue; }
    const r = check(parsed);
    if (!best || r.problems.length < best.problems.length) best = r;
    console.log(`  attempt ${attempt}: ${r.shots.length} shots, ${r.problems.length} problem(s)`);
    if (!r.problems.length) break;
    for (const p of r.problems.slice(0, 8)) console.log(`    - ${p}`);
    messages.push({ role: "assistant", content: JSON.stringify(parsed) },
      { role: "user", content: `Fix these problems and output the whole corrected JSON again (only JSON):\n${r.problems.slice(0, 25).map((p) => `- ${p}`).join("\n")}` });
  }
  if (!best || !best.shots.length) { console.error("no usable plan"); process.exit(1); }
  // whatever is still wrong is dropped, not rendered wrong: invalid shots go, warned actions were already skipped by the director
  const keep = best.shots.filter((s) => ShotSchema.safeParse(s).success);
  fs.writeFileSync(out, JSON.stringify({ title: best.title ?? idea, shots: keep }, null, 1));
  console.log(`✓ ${keep.length} shots → ${out}${best.problems.length ? ` (${best.problems.length} problem(s) left; the director skips those actions)` : ""}`);
  if (build) {
    const r = spawnSync("npx", ["tsx", "scripts/film/build-film.ts", "--shots", out, "--slug", build, "--title", best.title ?? idea], { stdio: "inherit" });
    process.exit(r.status ?? 1);
  }
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
