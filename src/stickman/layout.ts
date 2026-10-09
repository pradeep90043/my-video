import { GROUNDED_PROP_BOTTOM, type PropType } from "./schema";
import { PANEL } from "./PanelGeometry";
import type { World } from "./theme";

/**
 * Scene layout: decides where the figure, panel, props and callouts go so they never overlap.
 *
 * Rule: a panel owns one side of the frame ("right" by default, `side: "left"` mirrors it) and the
 * figure always stands in the strip on the OTHER side, facing the panel. Everything is solved in
 * screen space against the worst-case camera move, because the camera only transforms the figure
 * and props (panels/callouts are drawn outside the camera group).
 */

/** Horizontal reach of the figure (arm length + shoulder) and its full height, in figure units. */
export const FIGURE_HALF = 205;
export const FIGURE_HEIGHT = 560;
const FIGURE_SCALE = 1.15;
const PANEL_MARGIN = 30;
const EDGE = 16;

/** Worst-case camera: zoom up to ~1.12 (push + punch), horizontal pan up to 40px. */
const CAM_SCALES = [1, 1.05, 1.12];
const CAM_PAN = 40;

const PROP_BASE_SCALE = 1.7;
const WIDE_PROPS: readonly PropType[] = ["laptop", "code", "chartUp", "chartDown"];
const propHalf = (type: PropType) => (WIDE_PROPS.includes(type) ? 150 : 110);

type Span = [number, number];

/** Screen-space span of the world interval [a, b] over every camera state. */
function screenSpan(world: World, a: number, b: number): Span {
  const c = world.width / 2;
  let lo = Infinity, hi = -Infinity;
  for (const s of CAM_SCALES) for (const dx of [-CAM_PAN, CAM_PAN]) {
    lo = Math.min(lo, c + dx + (a - c) * s);
    hi = Math.max(hi, c + dx + (b - c) * s);
  }
  return [lo, hi];
}

/** Slide `fx` until the figure (half width `hw`) stays inside [lo, hi] on screen under any camera. */
function fitFigure(world: World, fx: number, hw: number, lo: number, hi: number): number {
  let x = fx;
  for (let i = 0; i < 8; i++) {
    const [a, b] = screenSpan(world, x - hw, x + hw);
    if (b > hi) x -= b - hi;
    else if (a < lo) x += lo - a;
    else break;
  }
  return x;
}

/** Largest scale (<= want) at which the figure's worst-case screen width fits `width`. */
function fitScale(world: World, want: number, width: number): number {
  let s = want;
  while (s > 0.5) {
    const [a, b] = screenSpan(world, world.width / 2 - FIGURE_HALF * s, world.width / 2 + FIGURE_HALF * s);
    if (b - a <= width) break;
    s -= 0.05;
  }
  return Math.max(0.5, s);
}

export interface LayoutInput {
  world: World;
  vertical: boolean;
  /** panel to show, and which side it takes (default right) */
  hasPanel: boolean;
  side?: "left" | "right";
  figureX?: number;
  flip: boolean;
  figureScale?: number;
  hasCallouts: boolean;
  calloutCount: number;
  props: { type: PropType; x: number; y?: number; scale: number }[];
}

export interface PanelPlacement { tx: number; ty: number; scale: number }
export interface PropPlacement { x: number; scale: number; hidden: boolean }

export interface SceneLayout {
  figureX: number;
  figureScale: number;
  flip: boolean;
  panel: PanelPlacement | null;
  props: PropPlacement[];
  /** screen-space x range callouts may use (the side the figure is not on) */
  calloutRange: Span;
}

export function layoutScene(i: LayoutInput): SceneLayout {
  const { world, vertical } = i;
  const W = world.width;

  // ── panel + figure ──
  let panel: PanelPlacement | null = null;
  let figureX: number, figureScale: number, flip: boolean;
  let calloutRange: Span = [40, W - 40];

  if (i.hasPanel && !vertical) {
    const side = i.side ?? "right";
    const panelX = side === "right" ? PANEL.x : W - PANEL.x - PANEL.w;
    panel = { tx: panelX - PANEL.x, ty: 0, scale: 1 };
    // strip of the frame the panel leaves free
    const [lo, hi] = side === "right" ? [EDGE, PANEL.x - PANEL_MARGIN] : [W - PANEL.x + PANEL_MARGIN, W - EDGE];
    figureScale = fitScale(world, i.figureScale ?? 0.8, hi - lo);
    const hw = FIGURE_HALF * figureScale;
    const want = i.figureX === undefined ? (lo + hi) / 2 : (side === "right" ? i.figureX : 1 - i.figureX) * W;
    figureX = fitFigure(world, want, hw, lo, hi);
    flip = side === "left";
  } else if (i.hasPanel) {
    // vertical: the panel takes the top, the figure stands below it
    const ps = (W - 40) / PANEL.w;
    const top = 240;
    panel = { tx: 20 - ps * PANEL.x, ty: top - ps * PANEL.y, scale: ps };
    const panelBottom = top + PANEL.h * ps;
    const room = world.ground - (panelBottom + 24);
    figureScale = Math.min(i.figureScale ?? 1, room / (FIGURE_HEIGHT * CAM_SCALES[2]));
    figureScale = Math.max(0.5, Math.min(figureScale, fitScale(world, figureScale, W - 2 * EDGE)));
    const hw = FIGURE_HALF * figureScale;
    figureX = fitFigure(world, (i.figureX ?? 0.5) * W, hw, EDGE, W - EDGE);
    flip = i.flip;
  } else {
    figureScale = i.figureScale ?? (vertical ? 1.9 : FIGURE_SCALE);
    const wantFrac = i.figureX ?? (vertical ? 0.5 : 0.3);
    let frac = i.flip ? 1 - wantFrac : wantFrac;
    if (vertical) {
      // keep the headroom the title and callout column need
      if (i.hasCallouts) {
        const bottom = 270 + (i.calloutCount - 1) * 100 + 76 + 24;
        figureScale = Math.min(figureScale, (world.ground - bottom) / (FIGURE_HEIGHT * CAM_SCALES[2]));
      }
      if (i.props.length > 0 && i.figureX === undefined) {
        // props need room beside the figure: tuck it to the side opposite the props
        figureScale = Math.min(figureScale, 1.3);
        const avg = i.props.reduce((a, p) => a + p.x, 0) / i.props.length;
        frac = avg >= 0.5 ? 0.25 : 0.75;
      }
    }
    figureScale = Math.max(0.5, Math.min(figureScale, fitScale(world, figureScale, W - 2 * EDGE)));
    const hw = FIGURE_HALF * figureScale;
    figureX = fitFigure(world, frac * W, hw, EDGE, W - EDGE);
    flip = i.flip;
  }

  // ── callouts: the screen side the figure does not use ──
  if (!vertical && !i.hasPanel) {
    const hw = FIGURE_HALF * figureScale;
    const [fa, fb] = screenSpan(world, figureX - hw, figureX + hw);
    calloutRange = figureX < W / 2 ? [Math.min(W - 40 - 240, fb + 30), W - 40] : [40, Math.max(40 + 240, fa - 30)];
  }

  // ── props: none beside a panel; otherwise keep clear of the figure ──
  const props: PropPlacement[] = i.props.map((p) => ({ x: p.x * W, scale: p.scale * PROP_BASE_SCALE, hidden: false }));
  if (i.hasPanel) {
    for (const p of props) p.hidden = true;
  } else if (!i.props.length) {
    // nothing to place
  } else {
    const hw = FIGURE_HALF * figureScale;
    const figTop = world.ground - FIGURE_HEIGHT * figureScale;
    const left = figureX - hw - 30, right = figureX + hw + 30;
    props.forEach((pl, k) => {
      const src = i.props[k];
      const bottom = GROUNDED_PROP_BOTTOM[src.type];
      const yc = src.y !== undefined ? src.y * world.height : bottom !== undefined ? world.ground - bottom * pl.scale : 500;
      // vertical extent (props are roughly square): clear above the figure's head means no conflict
      const reach = propHalf(src.type) * pl.scale;
      if (yc + reach < figTop - 10) return;
      let ph = propHalf(src.type) * pl.scale;
      const fits = (c: number, h: number) => c - h >= EDGE && c + h <= W - EDGE && (c + h <= left || c - h >= right);
      if (fits(pl.x, ph)) return;
      // try the far side of the figure on each side, then shrink the prop until it fits
      for (let f = 1; f >= 0.4; f -= 0.1) {
        ph = propHalf(src.type) * pl.scale * f;
        const cands = [left - ph, right + ph].sort((a, b) => Math.abs(a - pl.x) - Math.abs(b - pl.x));
        const c = cands.find((x) => fits(x, ph));
        if (c !== undefined) { pl.x = c; pl.scale *= f; return; }
      }
      pl.hidden = true;
    });
  }

  return { figureX, figureScale, flip, panel, props, calloutRange };
}
