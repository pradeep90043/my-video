import React from "react";
import { z } from "zod";
import { Creature, CreatureSchema, HeadKitSchema, KitHead } from "./Creature";

/**
 * Parts the planner's LLM drew because the catalog has nothing like them (a lion head for Narasimha, a tortoise, a camel, the
 * Sudarshan chakra...). The server draws, checks and caches them (src/my-video/flatDraw.ts); here they are drawn like catalog
 * parts. Their SVG is checked again: only plain shapes with plain attributes pass, anything else draws nothing.
 *
 * Units (the drawing's viewBox is in body units, an adult is about 1000 tall):
 *   head   - front view, about 240 wide; its bottom edge sits on the neck
 *   animal - side view facing right, the feet on the bottom edge
 *   set    - standing on the bottom edge
 *   prop   - centred, scaled to the size a held thing has
 */

export const DRAWN_ID = /^drawn-[a-z0-9-]{1,48}$/;
export const DrawnPartSchema = z.object({
  type: z.enum(["head", "animal", "prop", "set"]),
  description: z.string().max(200).optional(),
  /** a free drawing (props and set pieces) ... */
  svg: z.string().max(14000).optional(),
  w: z.number().min(10).max(2400).optional(),
  h: z.number().min(10).max(2400).optional(),
  /** ... or a body plan the engine draws (creatures, animal heads) */
  creature: CreatureSchema.optional(),
  kit: HeadKitSchema.optional(),
});
export type DrawnPart = z.infer<typeof DrawnPartSchema>;
export type DrawnLibrary = Record<string, DrawnPart>;

const ALLOWED_TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "polygon", "polyline", "line"]);
const ALLOWED_ATTRS = new Set(["d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "points", "x1", "y1", "x2", "y2", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "transform"]);
const SAFE_VALUE = /^[\w\s#.,\-+()%]*$/;

/** Only plain shapes with plain attributes pass; anything else (script, href, style, events, entities, text) rejects the drawing. */
export function sanitizeFlatSvg(svg: string): string | null {
  if (!svg || svg.length > 14000) return null;
  if (svg.replace(/<[^>]*>/g, "").trim().length > 0) return null;
  for (const t of svg.match(/<[^>]*>/g) ?? []) {
    const m = /^<\s*(\/?)\s*([a-zA-Z]+)([^>]*?)(\/?)\s*>$/.exec(t);
    if (!m || !ALLOWED_TAGS.has(m[2].toLowerCase())) return null;
    if (m[1]) continue;
    const re = /\s+([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
    let rest = m[3], a: RegExpExecArray | null;
    while ((a = re.exec(m[3]))) {
      if (!ALLOWED_ATTRS.has(a[1]) || !SAFE_VALUE.test(a[2]) || /url\s*\(/i.test(a[2])) return null;
      rest = rest.replace(a[0], "");
    }
    if (rest.trim()) return null;
  }
  return svg;
}

/** A drawn part, placed by its own anchor (see the units above). `size` is used by props only. */
export const DrawnArt: React.FC<{ part?: DrawnPart; size?: number; t?: number; walking?: boolean; blink?: number; talkOpen?: number }> = ({ part, size = 90, t = 0, walking = false, blink = 1, talkOpen = 0 }) => {
  if (!part) return null;
  if (part.creature) return <Creature spec={CreatureSchema.parse(part.creature)} t={t} walking={walking} />;
  if (part.kit) return <KitHead k={HeadKitSchema.parse(part.kit)} blink={blink} talkOpen={talkOpen} />;
  const safe = part.svg ? sanitizeFlatSvg(part.svg) : null;
  if (!safe || !part.w || !part.h) return null;
  const { w, h } = part;
  let transform: string;
  if (part.type === "head") { const s = 240 / w; transform = `translate(0 -704) scale(${s}) translate(${-w / 2} ${-h})`; }
  else if (part.type === "prop") { const s = size / Math.max(w, h); transform = `scale(${s}) translate(${-w / 2} ${-h / 2})`; }
  else {
    // animals and set pieces stand on their bottom edge; an animal breathes, and bobs when it walks
    const bob = part.type === "animal" ? (walking ? -Math.abs(Math.sin(t * 1.4 * Math.PI * 2)) * 14 : Math.sin(t * 1.8) * 2) : 0;
    const breathe = part.type === "animal" ? 1 + Math.sin(t * 1.6) * 0.008 : 1;
    transform = `translate(0 ${bob}) scale(1 ${breathe}) translate(${-w / 2} ${-h})`;
  }
  return <g transform={transform} dangerouslySetInnerHTML={{ __html: safe }} />;
};
