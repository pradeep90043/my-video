/**
 * When a quiz shows its countdown and reveals its answer.
 *
 * Default: the answer appears at `revealAt` of the scene and the countdown bar runs from the first moments of the scene.
 * "Pause the video" mode (`revealBeforeEnd` set): the narrator asks the question, then the scene holds still while the viewer
 * thinks (the scene's `pauseAfter`), the countdown only starts when the narrator has stopped talking, and the answer turns
 * green `revealBeforeEnd` seconds before the scene ends, so the next scene (the explanation) follows straight on.
 */
export interface QuizTiming {
  /** frame the countdown bar starts shrinking */
  timerStart: number;
  /** frame the answer is revealed */
  revealFrame: number;
}

const DEFAULT_TIMER_START = 14;

export function quizTiming(opts: {
  durationFrames: number;
  revealAt: number;
  revealBeforeEnd?: number;
  /** frame (from the scene start) where the narration ends, when known */
  speakEnd?: number;
  fps: number;
}): QuizTiming {
  const { durationFrames, revealAt, revealBeforeEnd, speakEnd, fps } = opts;
  if (revealBeforeEnd === undefined) {
    return { timerStart: DEFAULT_TIMER_START, revealFrame: Math.round(durationFrames * revealAt) };
  }
  const timerStart = Math.min(Math.max(DEFAULT_TIMER_START, speakEnd ?? DEFAULT_TIMER_START), Math.max(0, durationFrames - fps * 2));
  const revealFrame = Math.max(timerStart + fps, durationFrames - Math.round(revealBeforeEnd * fps));
  return { timerStart, revealFrame: Math.min(revealFrame, durationFrames - 1) };
}
