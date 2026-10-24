import { PUPPET_ROLES, validatePuppet, type PuppetSpec } from "./spec";

/**
 * "Draw any character": builds the prompt that makes an LLM write a PuppetSpec, parses its answer and, when the drawing is not
 * usable, sends the exact problems back for another try. `ask` is injected (a free gateway in scripts/puppet/draw-character.ts,
 * a fake in tests), so this file has no network code.
 */
export const DRAW_RULES = `You draw a 2D flat-vector cartoon character as JSON for a puppet animator. Output ONLY one JSON object, no prose, no code fences.

COORDINATES: units are pixels, +x is right, +y is DOWN. The character FACES RIGHT (+x). The origin (0,0) is on the ground between its feet.
BONES: a tree. Exactly one root bone (parent: null), usually the body, placed with "at" relative to the origin (e.g. [0,-150] = body centre 150 above the ground).
Every other bone has "parent" and "at" = where its JOINT is, in the PARENT bone's own frame (before the parent rotates).
Each bone has "svg": its artwork drawn in its own frame, with the joint at (0,0). A leg hangs DOWN from its hip joint (draw from y=0 to y=+length and put the foot at the end). A head is drawn around its neck joint. A trunk or tail hangs down from its base. A wing is drawn from the shoulder going back (-x).
ROLES (how the animator moves a bone): ${PUPPET_ROLES.join(", ")}.
 body (root, breathes, leans), head (nods, tilts), jaw (opens when speaking; child of head), tail (sways), ear (flicks), wing (flaps when it flies/runs),
 trunk (hangs from the head, lifts to trumpet, lowers to eat), leg (walks; give diagonal legs the same "group": near-front + far-back = "A", far-front + near-back = "B"),
 lower (a lower leg or shin, child of a leg: bends at the knee), arm / forearm (for upright characters), extra (static decoration that follows its parent, e.g. tusks, horns, mane).
"z": draw order among siblings. Negative = drawn BEHIND the parent's art (use for the far-side legs, tail), 1 or more = in front (ears, near legs).
"rot": resting angle in degrees (clockwise). "amp": strength of the motion (1 = normal, 0 = still).
SVG: only <g> <path> <circle> <ellipse> <rect> <polygon> <polyline> <line>, attributes d cx cy r rx ry x y width height points x1 y1 x2 y2 fill stroke stroke-width stroke-linecap stroke-linejoin opacity transform. Nothing else (no text, image, style, gradients, url()).
Colour with palette tokens: $fur $furD (darker) $furL (lighter) $belly $accent $out (outline) $mouth $toe, and define them in "palette" as hex colours. Use stroke="$out" stroke-width="3.5" outlines like a flat sticker style. Round the shapes; keep them simple and readable.
"eyes": [{ "bone": "head", "at": [x,y], "r": 8 }] are drawn and blinked for you, so do not draw eyes in the svg.
"height": total standing height in pixels (a person is about 580, an elephant about 300, a crow about 170).
LEGLESS creatures (snake, worm, fish): no legs. The root "body" is the head end (draw the head, eyes and a tongue/mouth in its svg, resting on the ground: body "at" [0, -radius]); behind it hang 8 to 12 chain bones, each child of the previous one at "at" [-segmentLength, 0], role "tail", with "phase" growing by about 0.7 per bone (0, 0.7, 1.4 ...), each drawn as a THICK rounded segment (as thick as the head or only slightly thinner, with the SAME body colours and pattern as the head: back colour on top, belly colour below) that overlaps the next one so the body looks continuous, not like beads. The animator sends a wave down the chain.
Keep 8 to 16 bones (a legless chain may use up to 24). The far-side legs (z -2) use $furD. Make sure the feet end at y=0 when the body is at its rest position (the animator also corrects small errors).

JSON SHAPE: { "name": "...", "height": 300, "palette": { "fur": "#...", ... }, "bones": [ { "id": "body", "parent": null, "at": [0,-150], "role": "body", "svg": "<ellipse .../>" }, ... ], "eyes": [ ... ] }`;

export function buildPrompt(description: string, example: PuppetSpec, problems: string[] = [], previous?: string): string {
  const fix = problems.length
    ? `\n\nYour previous answer had these problems, fix them and answer again with the full corrected JSON:\n- ${problems.join("\n- ")}\n\nPrevious answer:\n${(previous ?? "").slice(0, 6000)}`
    : "";
  return `${DRAW_RULES}\n\nEXAMPLE (an elephant, for the format only; draw the new character in its own shape):\n${JSON.stringify(example)}\n\nNOW DRAW: ${description}${fix}`;
}

/** Pull the first JSON object out of a model answer (it may wrap it in fences or add a sentence). */
export function extractJson(raw: string): unknown {
  const text = raw.replace(/```[a-z]*\n?/gi, "").trim();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in the answer");
  return JSON.parse(text.slice(start, end + 1));
}

export interface DrawResult { spec: PuppetSpec; attempts: number }

export async function generatePuppet(description: string, example: PuppetSpec, ask: (prompt: string) => Promise<string>, maxAttempts = 3): Promise<DrawResult> {
  let problems: string[] = [], previous: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await ask(buildPrompt(description, example, problems, previous));
    previous = raw;
    try {
      const spec = extractJson(raw) as PuppetSpec;
      const issues = validatePuppet(spec);
      if (!issues.length) return { spec, attempts: attempt };
      problems = issues.map((i) => (i.bone ? `bone "${i.bone}": ${i.problem}` : i.problem));
    } catch (e) {
      problems = [`not valid JSON (${(e as Error).message})`];
    }
  }
  throw new Error(`could not get a valid drawing after ${maxAttempts} attempts: ${problems.join("; ")}`);
}
