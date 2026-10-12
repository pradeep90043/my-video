import { loadFont as loadNotoSansDevanagari } from "@remotion/google-fonts/NotoSansDevanagari";

/**
 * Hindi (Devanagari) glyphs. Montserrat and Inter have none, so a Hindi caption would render as boxes on a renderer with
 * no system Devanagari font (the GitHub runners). Listed after the Latin font in every text stack, so English text keeps
 * its font and only the Devanagari characters fall through to this one. Only the devanagari subset and the bold weights are fetched.
 */
const devanagari = loadNotoSansDevanagari("normal", { weights: ["700", "800", "900"], subsets: ["devanagari"] });

export const DEVANAGARI = devanagari.fontFamily;

/** `primary` (a loaded font family) + Devanagari + the generic fallback. */
export const withDevanagari = (primary: string, generic = "sans-serif"): string => `${primary}, ${DEVANAGARI}, ${generic}`;
