/**
 * Draw a new character from a description and save it as a puppet spec.
 *
 *   tsx scripts/puppet/draw-character.ts --desc "a small brown monkey with a long curly tail" --id monkey --project my-story
 *
 * Writes public/content/<project>/puppets/<id>.json (merge it into a cast member's `puppet`), then renders a pose sheet PNG next to it
 * for a quick look. The LLM is any OpenAI-compatible gateway: FREELLMAPI_URL (default http://localhost:3001), FREELLMAPI_KEY, PUPPET_MODEL (default "auto").
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { generatePuppet } from "../../src/stickman/story/puppet/generate";
import type { PuppetSpec } from "../../src/stickman/story/puppet/spec";

const args = process.argv.slice(2);
const opt = (n: string, d?: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const desc = opt("desc"), id = opt("id"), project = opt("project", "puppets")!;
if (!desc || !id || !/^[a-z0-9_-]+$/i.test(id)) { console.error("usage: --desc \"...\" --id <name> [--project <slug>]"); process.exit(1); }

const base = (process.env.FREELLMAPI_URL || "http://localhost:3001").replace(/\/$/, "");
async function ask(prompt: string): Promise<string> {
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.FREELLMAPI_KEY ?? ""}` },
    body: JSON.stringify({ model: process.env.PUPPET_MODEL || "auto", temperature: 0.4, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`LLM gateway answered ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

async function main() {
  const example = JSON.parse(fs.readFileSync(path.join(__dirname, "../../src/stickman/story/puppet/examples/elephant.json"), "utf8")) as PuppetSpec;
  const { spec, attempts } = await generatePuppet(desc!, example, ask);
  const dir = path.join("public/content", project, "puppets");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(spec, null, 1));
  console.log(`Drew "${spec.name ?? id}" in ${attempts} attempt(s) -> ${file}`);
  const props = path.join(dir, `${id}.sheet-props.json`);
  fs.writeFileSync(props, JSON.stringify({ spec }));
  const png = path.join(dir, `${id}.sheet.png`);
  execFileSync("npx", ["remotion", "still", "PuppetSheet", png, `--props=${props}`, "--gl=swangle"], { stdio: "inherit" });
  fs.unlinkSync(props);
  console.log(`Pose sheet: ${png}`);
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
