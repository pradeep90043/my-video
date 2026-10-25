import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPatrick } from "@remotion/google-fonts/PatrickHand";
import { loadFont as loadMarker } from "@remotion/google-fonts/PermanentMarker";
import { withDevanagari } from "../fonts";

// Latin subsets only: English captions and UI; Devanagari falls through to Noto via withDevanagari.
const inter = loadInter("normal", { weights: ["400", "600", "800", "900"], subsets: ["latin"] });
const patrick = loadPatrick("normal", { weights: ["400"], subsets: ["latin"] });
const marker = loadMarker("normal", { weights: ["400"], subsets: ["latin"] });

export const UI_FONT = withDevanagari(inter.fontFamily);
export const HAND_FONT = withDevanagari(patrick.fontFamily);
export const MARKER_FONT = withDevanagari(marker.fontFamily);
