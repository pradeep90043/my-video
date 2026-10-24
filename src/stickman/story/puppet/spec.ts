/**
 * A drawn character as DATA: a bone tree whose bones carry SVG art. An LLM can write one for any creature or object; the shared
 * animator (animate.ts) moves it by each bone's `role`, so nothing is hand-coded per animal.
 *
 * Conventions (the generator prompt repeats them): origin = between the feet on the ground, +y points down, the creature faces +x.
 * A bone's `at` is its joint's position in the PARENT bone's frame (the root's is relative to the origin). A bone's `svg` is drawn
 * in its own frame with the joint at (0,0): a leg hangs down from its hip, a head is drawn around its neck joint, a trunk hangs from its base.
 */
export const PUPPET_ROLES = ["body", "head", "jaw", "tail", "ear", "wing", "trunk", "leg", "lower", "arm", "forearm", "extra"] as const;
export type PuppetRole = (typeof PUPPET_ROLES)[number];

export interface PuppetBone {
  id: string;
  /** null for the one root bone */
  parent: string | null;
  at: [number, number];
  role: PuppetRole;
  /** legs / arms: A and B move in opposition (a diagonal pair of legs shares a group) */
  group?: "A" | "B";
  /** resting angle, degrees (clockwise) */
  rot?: number;
  /** strength of the role's motion, 1 = normal */
  amp?: number;
  /** draw order among siblings: below 0 is drawn behind the parent's art */
  z?: number;
  /** inline SVG (whitelisted shapes only); colours may be palette tokens: $fur $furD $furL $belly $accent $out $mouth $toe */
  svg: string;
}

export interface PuppetSpec {
  name?: string;
  /** how tall it stands, for name tags and speech bubbles */
  height: number;
  palette: Record<string, string>;
  bones: PuppetBone[];
  /** eyes drawn on a bone: blink and mood are animated for any creature */
  eyes?: { bone: string; at: [number, number]; r: number }[];
}

const ALLOWED_TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "polygon", "polyline", "line"]);
const ALLOWED_ATTRS = new Set(["d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "points", "x1", "y1", "x2", "y2", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "transform"]);
const SAFE_VALUE = /^[\w\s#$.,\-+()%]*$/;

/** Only plain shapes with plain attributes pass; anything else (script, href, style, event handlers, entities) rejects the whole drawing. */
export function sanitizeSvg(svg: string): string | null {
  if (svg.length > 6000) return null;
  const tags = svg.match(/<[^>]*>/g) ?? [];
  if (tags.join("").length === 0 && svg.trim().length > 0) return null;
  if (svg.replace(/<[^>]*>/g, "").trim().length > 0) return null; // no stray text
  for (const t of tags) {
    const m = /^<\s*(\/?)\s*([a-zA-Z]+)([^>]*?)(\/?)\s*>$/.exec(t);
    if (!m) return null;
    if (!ALLOWED_TAGS.has(m[2].toLowerCase())) return null;
    if (m[1]) continue;
    const attrs = m[3];
    const re = /\s+([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
    let rest = attrs, a: RegExpExecArray | null;
    while ((a = re.exec(attrs))) {
      if (!ALLOWED_ATTRS.has(a[1]) || !SAFE_VALUE.test(a[2])) return null;
      rest = rest.replace(a[0], "");
    }
    if (rest.trim().length > 0) return null;
  }
  return svg;
}

export interface PuppetIssue { bone?: string; problem: string }

/** Structural checks: one root, parents exist, no cycles, sane sizes, safe art. Returns the problems (empty = usable). */
export function validatePuppet(p: unknown): PuppetIssue[] {
  const out: PuppetIssue[] = [];
  const s = p as PuppetSpec;
  if (!s || typeof s !== "object") return [{ problem: "not an object" }];
  if (!(typeof s.height === "number" && s.height >= 60 && s.height <= 700)) out.push({ problem: "height must be 60..700" });
  if (!s.palette || typeof s.palette !== "object") out.push({ problem: "palette missing" });
  if (!Array.isArray(s.bones) || s.bones.length < 2 || s.bones.length > 28) return [...out, { problem: "need 2..28 bones" }];
  const ids = new Set<string>();
  for (const b of s.bones) {
    if (!b || typeof b.id !== "string" || !b.id) { out.push({ problem: "bone without id" }); continue; }
    if (ids.has(b.id)) out.push({ bone: b.id, problem: "duplicate id" });
    ids.add(b.id);
    if (!PUPPET_ROLES.includes(b.role)) out.push({ bone: b.id, problem: `unknown role ${b.role}` });
    if (!(Array.isArray(b.at) && b.at.length === 2 && b.at.every((n) => Number.isFinite(n) && Math.abs(n) < 800))) out.push({ bone: b.id, problem: "bad `at`" });
    if (typeof b.svg !== "string" || sanitizeSvg(b.svg) === null) out.push({ bone: b.id, problem: "svg missing or not allowed" });
  }
  const roots = s.bones.filter((b) => b.parent === null);
  if (roots.length !== 1) out.push({ problem: "exactly one root bone (parent null)" });
  for (const b of s.bones) {
    if (b.parent !== null && !ids.has(b.parent)) out.push({ bone: b.id, problem: `parent ${b.parent} not found` });
    // cycle check
    let cur: PuppetBone | undefined = b, hops = 0;
    while (cur && cur.parent !== null && hops++ < 40) cur = s.bones.find((x) => x.id === cur!.parent);
    if (hops >= 40) out.push({ bone: b.id, problem: "cycle" });
  }
  for (const e of s.eyes ?? []) if (!ids.has(e.bone)) out.push({ problem: `eye on unknown bone ${e.bone}` });
  return out;
}

/** Replace $tokens with the palette's colours (an unknown token falls back to the outline colour). */
export function paint(svg: string, palette: Record<string, string>): string {
  return svg.replace(/\$([A-Za-z]+)/g, (_, k) => palette[k] ?? palette.out ?? "#2B2B2B");
}
