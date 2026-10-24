/**
 * Have an LLM write a short Hindi story AND its scene plan for the storyboard engine, validated against the engine's own vocabulary.
 *
 *   tsx scripts/puppet/plan-story.ts --idea "a panda and a snake become friends after fighting a giant snake" \
 *        --cast "panda:पांडा,snake:साँप,giant:बड़ा साँप" --seconds 120 --out scenes.json
 *
 * Output (scenes.json): [{ text, bg, time, fx, ambient?, chars:[{id,x,pose,mood,flip?,says?,react?,holds?}], props:[{type,x}], foley:[{name,at,volume?}] }]
 * LLM endpoint as in draw-character.ts (PUPPET_LLM_URL/PUPPET_LLM_KEY/PUPPET_MODEL, or FreeLLMAPI).
 */
import * as fs from "fs";
import { CHAR_MOODS, CHAR_POSES, STORY_BGS, STORY_TIMES } from "../../src/stickman/story/cast";
import { STORY_FX, STORY_PROPS } from "../../src/stickman/story/StoryProps";
import { AMBIENT_NAMES, FOLEY_NAMES } from "../../src/stickman/sounds";
import { extractJson } from "../../src/stickman/story/puppet/generate";

const args = process.argv.slice(2);
const opt = (n: string, d?: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const idea = opt("idea"), castArg = opt("cast"), out = opt("out", "scenes.json")!, seconds = Number(opt("seconds", "120"));
if (!idea || !castArg) { console.error('usage: --idea "..." --cast "id:नाम,id2:नाम2" [--seconds 120] [--out scenes.json]'); process.exit(1); }
const cast = castArg.split(",").map((c) => { const [id, ...n] = c.split(":"); return { id: id.trim(), name: n.join(":").trim() }; });
const ids = new Set(cast.map((c) => c.id));
const words = Math.round(seconds * 2.2); // narration ~ 2.2 words/s after the usual 1.2x voice speed-up
const chatUrl = process.env.PUPPET_LLM_URL || `${(process.env.FREELLMAPI_URL || "http://localhost:3001").replace(/\/$/, "")}/v1/chat/completions`;
const key = process.env.PUPPET_LLM_KEY ?? process.env.FREELLMAPI_KEY ?? "";

async function ask(prompt: string): Promise<string> {
  const res = await fetch(chatUrl, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.PUPPET_MODEL || "auto", temperature: 0.7, max_tokens: 9000, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`LLM answered ${res.status}`);
  const j = (await res.json()) as any;
  const c = j.choices?.[0];
  if (process.env.PLAN_DEBUG) console.log(`  [${j.model}] finish=${c?.finish_reason} chars=${(c?.message?.content ?? "").length} head=${JSON.stringify((c?.message?.content ?? "").slice(0, 120))}`);
  return c?.message?.content ?? "";
}

const prompt = (feedback: string) => `You write a children's story for a Hindi storytelling channel and plan it as storyboard scenes. Output ONLY a JSON array, no prose, no code fences.

STORY IDEA: ${idea}
CAST (use these ids only; they are animals drawn as cartoon characters): ${cast.map((c) => `${c.id} = ${c.name}`).join(", ")}
LENGTH: about ${words} words of narration in total (target ${seconds} seconds spoken), spread over 22 to 26 scenes of 8 to 14 words each. Clear beginning, a fight, a turning point, a happy ending, and a one-line moral at the end.
LANGUAGE: Hindi in Devanagari script, simple spoken storytelling tone. Write numbers as words. No English words, no emojis. Keep any quoted speech short.

Each array item: { "text": "narration of the scene", "bg": ..., "time": ..., "fx": ..., "ambient": optional, "chars": [ { "id": cast id, "x": 0-100 (screen position, 0 left), "pose": ..., "mood": ..., "flip": optional true = faces left, "says": optional short quote (max 30 chars, Devanagari), "react": optional "no"|"yes"|"shrug"|"surprise"|"laugh", "speaking": true only when this character says the quoted line } ], "props": [ { "type": ..., "x": 0-100 } ] (at most 3), "foley": [ { "name": ..., "at": seconds from the scene start, "volume": 0.2-0.7 } ] (at most 3) }
bg one of: ${["forest", "mountain", "river", "cave", "village", "farm", "road"].filter((b) => (STORY_BGS as readonly string[]).includes(b)).join(", ")}
time one of: ${STORY_TIMES.join(", ")}.  fx one of: ${STORY_FX.join(", ")}.
pose one of: ${CHAR_POSES.join(", ")}.  mood one of: ${CHAR_MOODS.join(", ")}.
props type one of: ${["tree", "stone", "rope", "fire", "food", "flowers", "heart", "star", "crown", "chest", "lamp"].filter((p) => (STORY_PROPS as readonly string[]).includes(p)).join(", ")}.
ambient one of: ${AMBIENT_NAMES.join(", ")}.  foley one of: ${FOLEY_NAMES.join(", ")}.
RULES: a fight uses poses fight / struggle / push / shout / run on both fighters; fear uses scared; friendship uses hug / happy / dance. Put characters at different x positions (30 and 70) and face them toward each other with flip on the right one. Use 1 or 2 characters per scene (3 at the climax). Keep the same ambient bed across consecutive scenes; use night / dusk time for the scary part. Use foley "punch", "thud", "run", "footsteps-grass" for action.${feedback}`;

function clean(raw: unknown): any[] {
  if (!Array.isArray(raw)) throw new Error("answer is not an array");
  const pick = <T extends string>(list: readonly T[], v: unknown, d: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d);
  return raw.map((s: any, i) => {
    if (!s || typeof s.text !== "string" || !s.text.trim()) throw new Error(`scene ${i} has no text`);
    const chars = (Array.isArray(s.chars) ? s.chars : []).filter((c: any) => ids.has(c?.id)).slice(0, 4).map((c: any) => ({
      id: c.id, x: Math.max(5, Math.min(95, Number(c.x) || 50)), pose: pick(CHAR_POSES, c.pose, "stand"), mood: pick(CHAR_MOODS, c.mood, "neutral"),
      ...(c.flip ? { flip: true } : {}), ...(typeof c.says === "string" && c.says.length <= 36 ? { says: c.says } : {}), ...(c.speaking ? { speaking: true } : {}),
      ...(["no", "yes", "shrug", "surprise", "laugh"].includes(c.react) ? { react: c.react } : {}),
    }));
    if (!chars.length) throw new Error(`scene ${i} has no valid character (use ${[...ids].join(", ")})`);
    return {
      text: s.text.trim(), bg: pick(STORY_BGS, s.bg, "forest"), time: pick(STORY_TIMES, s.time, "day"), fx: pick(STORY_FX, s.fx, "none"),
      ...(AMBIENT_NAMES.includes(s.ambient) ? { ambient: s.ambient } : {}), chars,
      props: (Array.isArray(s.props) ? s.props : []).filter((p: any) => (STORY_PROPS as readonly string[]).includes(p?.type)).slice(0, 3).map((p: any) => ({ type: p.type, x: Math.max(5, Math.min(95, Number(p.x) || 50)) })),
      foley: (Array.isArray(s.foley) ? s.foley : []).filter((f: any) => (FOLEY_NAMES as readonly string[]).includes(f?.name)).slice(0, 3).map((f: any) => ({ name: f.name, at: Math.max(0, Math.min(8, Number(f.at) || 0)), volume: Math.max(0.15, Math.min(0.7, Number(f.volume) || 0.5)) })),
    };
  });
}

async function main() {
  let feedback = "", best: any[] | undefined;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const scenes = clean(extractJson2(await ask(prompt(feedback))));
      const n = scenes.reduce((a, s) => a + s.text.split(/\s+/).length, 0);
      console.log(`attempt ${attempt}: ${scenes.length} scenes, ${n} words (target ${words})`);
      best = scenes;
      if (scenes.length >= 20 && Math.abs(n - words) <= words * 0.15) break;
      feedback = `\n\nYour last answer had ${scenes.length} scenes and ${n} words; I need 22-26 scenes and ${words} words (+/-10%). Rewrite the whole array.`;
    } catch (e) { console.log(`attempt ${attempt} failed: ${(e as Error).message}`); feedback = `\n\nYour last answer was unusable (${(e as Error).message}). Output only the JSON array.`; }
  }
  if (!best) { console.error("no usable plan"); process.exit(1); }
  fs.writeFileSync(out, JSON.stringify(best, null, 1));
  console.log(`wrote ${out}`);
}
// the answer is an array, not an object: pull the outermost [...]
function extractJson2(raw: string): unknown {
  const t = raw.replace(/```[a-z]*\n?/gi, "").trim();
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a < 0 || b <= a) return extractJson(raw);
  return JSON.parse(t.slice(a, b + 1));
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
