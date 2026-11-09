/**
 * Paints the assets of the illustrated test scene on a free Kaggle GPU (Playground v2.5): characters on plain white (cut out later by
 * prepare.py) and empty backgrounds. Two seeds each, so the better one can be kept.
 *   tsx scripts/illustrated/paint-test.ts
 */
import * as path from "path";
import { runKaggleImageGen, type KaggleImagePrompt } from "../shared/providers/KaggleImageRunner";

const STYLE = "2D storybook painting, Indian mythology animated series style, painterly soft shading, rich warm colours, detailed ornaments, clean shapes, high quality illustration";
const FIG = "full body, the whole figure visible from head to feet, standing, isolated on a plain pure white background, no shadow, no frame, no text";
const BG = "wide establishing background painting, no people, no characters, empty scene, cinematic composition, depth, no text";
const NEG = "photo, photorealistic, 3d render, frame, border, text, watermark, signature, cropped, cut off feet, extra limbs, deformed hands, blurry, low quality";

const items: [string, string, number, number][] = [
  ["king", `a young Indian king with a tall golden crown, jewelled necklaces, maroon and gold royal robe, a sword at the waist, calm proud face, side profile facing right, ${FIG}`, 832, 1216],
  ["minister", `an old Indian royal minister with a white beard, white turban, saffron and cream robes, holding a scroll, kind wise face, side profile facing left, ${FIG}`, 832, 1216],
  ["deer", `a magical golden deer with silver spots and glowing eyes, standing, side view facing left, ${FIG}`, 1216, 832],
  ["palace", `ancient Indian palace courtyard at dusk, carved sandstone pillars, oil lamps glowing, orange and purple sky, a fountain in the distance, ${BG}`, 1344, 768],
  ["forest", `enchanted Indian forest path in the morning, tall trees with pink blossoms, soft golden sun rays through the leaves, a dirt path in the middle, ${BG}`, 1344, 768],
  ["clearing", `moonlit forest clearing at night, glowing fireflies, a big full moon, silver mist between trees, ${BG}`, 1344, 768],
];

(async () => {
  const prompts: KaggleImagePrompt[] = items.flatMap(([id, p, w, h]) => [11, 29].map((seed) => ({ id: `${id}-${seed}`, prompt: `${p}, ${STYLE}`, negative: NEG, width: w, height: h, seed })));
  const out = path.join(process.cwd(), "public/content/illustrated-test/raw");
  const res = await runKaggleImageGen(prompts, out, { slot: "mv-illustrate", runner: path.join(__dirname, "paint_runner.py"), giveUpMs: 40 * 60_000 });
  console.log(`painted ${res.size}/${prompts.length} -> ${out}`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
