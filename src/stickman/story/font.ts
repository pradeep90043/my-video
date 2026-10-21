import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { withDevanagari } from "../fonts";

// Inter has no Devanagari: the GitHub runners have no system Hindi font, so name tags / headlines would render as boxes.
const inter = loadInter("normal", { weights: ["800", "900"], subsets: ["latin"] });
export const STORY_FONT = withDevanagari(inter.fontFamily);
