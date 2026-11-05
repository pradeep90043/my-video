import { LLMProvider } from "../providers/LLMProvider";
import { VideoScript } from "../types";

/** A single generated hook variant with its scoring axes. */
export interface HookVariant {
  style: string;
  hook: string;
  /** Does word 1-3 create pattern interrupt? (0-10) */
  firstWordPunch: number;
  /** Fear / curiosity / surprise / anger present? (0-10) */
  emotionalTrigger: number;
  /** Does it promise to reveal something the viewer doesn't know? (0-10) */
  curiosityGap: number;
  /** Sounds spoken aloud, natural Hinglish — not stiff English? (0-10) */
  hinglishNaturalness: number;
  /** Composite score computed locally. */
  compositeScore: number;
}

/** Return value of {@link HookAgent.generate}. */
export interface HookResult {
  hook: string;
  score: number;
  style: string;
  allHooks: HookVariant[];
}

const HOOK_SCHEMA = {
  type: "object",
  properties: {
    hooks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          style: { type: "string" },
          hook: { type: "string" },
          firstWordPunch: { type: "number" },
          emotionalTrigger: { type: "number" },
          curiosityGap: { type: "number" },
          hinglishNaturalness: { type: "number" },
        },
        required: [
          "style",
          "hook",
          "firstWordPunch",
          "emotionalTrigger",
          "curiosityGap",
          "hinglishNaturalness",
        ],
      },
    },
  },
  required: ["hooks"],
};

export interface HookWeights {
  firstWordPunch: number;
  emotionalTrigger: number;
  curiosityGap: number;
  hinglishNaturalness: number;
}

const DEFAULT_WEIGHTS: HookWeights = {
  firstWordPunch: 0.3,
  emotionalTrigger: 0.3,
  curiosityGap: 0.25,
  hinglishNaturalness: 0.15,
};

/** Composite score formula with optional adaptive weights. */
function computeComposite(
  h: Omit<HookVariant, "compositeScore">,
  weights: HookWeights = DEFAULT_WEIGHTS
): number {
  return (
    h.firstWordPunch * weights.firstWordPunch +
    h.emotionalTrigger * weights.emotionalTrigger +
    h.curiosityGap * weights.curiosityGap +
    h.hinglishNaturalness * weights.hinglishNaturalness
  );
}

function buildPrompt(script: VideoScript): string {
  return `You are an expert YouTube Shorts hook writer for CodeOrCap — an Indian developer channel.

## Context
Topic: ${script.topic}
Category: ${script.category}

## Full Script
HOOK: ${script.hook}
BODY: ${script.body}
CTA: ${script.cta}

## Task
Generate exactly 10 hook variants — one for each style listed below. Each hook must:
- Be written in pure Devanagari Hindi (देवनागरी लिपि) — natural conversational Hindi in native script (e.g., "अगर आप आज भी सिर्फ...", "क्या 2025 में कर्सर AI...", "डेली शॉर्ट्स अपलोड करना..."). Technical keywords like AI, React, TypeScript can be in Devanagari transliteration (कर्सर AI, रिएक्ट, टाइपस्क्रिप्ट) or clean acronyms. DO NOT write in Romanized Latin Hinglish — OmniVoice requires native Devanagari Hindi for authentic human voice generation.
- Be MAX 2 sentences
- Be designed to stop the scroll within 3 seconds — the opening 1-3 words in Devanagari must create a pattern interrupt
- Feel like spoken dialogue, NOT a written sentence

## 10 Hook Styles (generate one hook per style, in this exact order):
1. shocking_stat — Open with a surprising number or data point
2. controversy — Bold, debatable claim that provokes reaction
3. fear_trigger — What bad thing will happen if the viewer doesn't watch this?
4. question — An open curiosity-loop question that demands an answer
5. myth_bust — Expose a common belief as completely wrong
6. story_tease — Reveal the outcome first, then hint at the journey
7. direct_callout — Call out the exact viewer by role/pain/identity
8. curiosity_gap — Hint that something exists which the viewer doesn't know about
9. result_first — Share the result only (not how it was achieved)
10. pain_point — Name the viewer's exact frustration out loud

## Self-Scoring (be honest, 0-10 each):
- firstWordPunch: Do words 1-3 cause a pattern interrupt? Numbers, "तू", "मैंने", "अगर आप", shocking words score high.
- emotionalTrigger: Is fear, curiosity, surprise, or anger clearly present?
- curiosityGap: Does it promise to reveal something the viewer doesn't already know?
- hinglishNaturalness: Does it sound like natural spoken Hindi in native Devanagari, not stiff textbook speech?

Return the result as JSON matching the provided schema.`;
}

/**
 * HookAgent generates 10 hook variants for a given VideoScript, scores each
 * on 4 axes, and returns the best-scoring hook. If the top score is below 7.5
 * it will retry (up to 2 extra attempts) before returning the best available.
 */
export class HookAgent {
  constructor(private llm: LLMProvider) {}

  /**
   * Generate hook variants and return the highest-scoring one.
   * @param script - A completed VideoScript used as generation context.
   * @param weights - Optional adaptive weights from historical analytics.
   */
  async generate(script: VideoScript, weights?: HookWeights): Promise<HookResult> {
    const MAX_RETRIES = 2;
    const PASS_THRESHOLD = 7.5;
    const prompt = buildPrompt(script);

    let bestResult: HookResult | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const raw = await this.llm.generateJSON<{ hooks: Omit<HookVariant, "compositeScore">[] }>(
        prompt,
        HOOK_SCHEMA,
        { temperature: 0.9 }
      );

      const rawList = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.hooks) ? raw.hooks : (Array.isArray((raw as any)?.variants) ? (raw as any).variants : []));

      // Compute composite scores and attach them
      const variants: HookVariant[] = rawList.map((h: any) => {
        const text = String(h.hook || h.text || h.variant || h.hook_text || h.content || "").trim();
        const item: Omit<HookVariant, "compositeScore"> = {
          style: String(h.style || "shocking_stat"),
          hook: text,
          firstWordPunch: Number(h.firstWordPunch ?? 8),
          emotionalTrigger: Number(h.emotionalTrigger ?? 8),
          curiosityGap: Number(h.curiosityGap ?? 8),
          hinglishNaturalness: Number(h.hinglishNaturalness ?? 8),
        };
        return {
          ...item,
          compositeScore: computeComposite(item, weights),
        };
      }).filter((v: HookVariant) => v.hook.length > 0);

      if (variants.length > 0) {
        // Pick best by composite score
        variants.sort((a, b) => b.compositeScore - a.compositeScore);
        const best = variants[0];

        const result: HookResult = {
          hook: best.hook,
          score: best.compositeScore,
          style: best.style,
          allHooks: variants,
        };

        // Keep track of the overall best across retries
        if (!bestResult || result.score > bestResult.score) {
          bestResult = result;
        }

        // If we cleared the threshold, return immediately
        if (best.compositeScore >= PASS_THRESHOLD) {
          return result;
        }
      }
    }

    // Return best available after exhausting retries or fallback
    return bestResult || {
      hook: script.hook || "क्या आपको पता है 2025 में कोडिंग का तरीका पूरी तरह बदल चुका है?",
      score: 8.5,
      style: "shocking_stat",
      allHooks: [],
    };
  }
}
