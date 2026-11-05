import { LLMProvider } from "../providers/LLMProvider";
import { VideoScript } from "../types";

/** Detailed per-criterion scores and overall QA result. */
export interface QAResult {
  /** Overall weighted score (0-100). */
  score: number;
  /** True when score >= 75. */
  passed: boolean;
  /** Individual criterion scores (0-10 each). */
  criteria: {
    /** Hook stops scroll in ≤ 3 words (weight 25%). */
    hookStopsScroll: number;
    /** Pacing check adapted to long-form vs short (weight 20%). */
    pacingCheck: number;
    /** Fear/curiosity/surprise trigger is clearly present (weight 20%). */
    emotionalTrigger: number;
    /** Primary keyword appears ≥ 3× naturally (weight 15%). */
    keywordDensity: number;
    /** CTA asks specific question, not generic "subscribe" (weight 10%). */
    ctaSpecific: number;
    /** Hinglish ratio is 60-80% Hindi (weight 10%). */
    hinglishRatio: number;
  };
  /** Human-readable list of what failed or scored low. */
  issues: string[];
  /** Which script sections need a rewrite. */
  rewriteSections: ("hook" | "body" | "cta")[];
}

const QA_SCHEMA = {
  type: "object",
  properties: {
    hookStopsScroll: { type: "number" },
    pacingCheck: { type: "number" },
    emotionalTrigger: { type: "number" },
    keywordDensity: { type: "number" },
    ctaSpecific: { type: "number" },
    hinglishRatio: { type: "number" },
    issues: { type: "array", items: { type: "string" } },
    rewriteSections: {
      type: "array",
      items: { type: "string", enum: ["hook", "body", "cta"] },
    },
  },
  required: [
    "hookStopsScroll",
    "pacingCheck",
    "emotionalTrigger",
    "keywordDensity",
    "ctaSpecific",
    "hinglishRatio",
    "issues",
    "rewriteSections",
  ],
};

/** Criterion weights that sum to 1.0. */
const WEIGHTS = {
  hookStopsScroll: 0.25,
  pacingCheck: 0.2,
  emotionalTrigger: 0.2,
  keywordDensity: 0.15,
  ctaSpecific: 0.1,
  hinglishRatio: 0.1,
} as const;

type CriteriaKey = keyof typeof WEIGHTS;

function computeScore(criteria: QAResult["criteria"]): number {
  return (Object.keys(WEIGHTS) as CriteriaKey[]).reduce(
    (sum, key) => sum + criteria[key] * WEIGHTS[key] * 10,
    0
  );
}

function buildPrompt(script: VideoScript, mode: "short" | "long" = "short"): string {
  const isLong = mode === "long";
  const durationSecs = script.durationSecs || (isLong ? 600 : 45);
  const durationLabel = `${Math.round(durationSecs / 60)}-minute (${durationSecs}s)`;
  const pacingRule = isLong
    ? `2. pacingCheck (weight 20%): For long-form (${durationLabel} content), evaluate narrative progression across the 6 sections (intro, problem, deep dives, solution, cta). Does it fit the ${durationLabel} duration appropriately, avoid monotonous monologue walls, and maintain viewer engagement with frequent conceptual hooks, rhetorical questions, and story beats? Score high if well-structured and engaging for a ${durationLabel} video.`
    : "2. pacingCheck (weight 20%): For shorts (30-60s), is each spoken body point punchy (≤ 12 seconds) without trailing sentences or filler words?";

  return `You are a strict ${isLong ? `long-form (${durationLabel}) YouTube` : "YouTube Shorts"} script QA evaluator for CodeOrCap — an Indian developer channel.

## Script to evaluate (${isLong ? `${durationLabel} Long Form Video` : "YouTube Shorts"})
Topic: ${script.topic}
Category: ${script.category}
Target Duration: ${durationSecs} seconds (${Math.round(durationSecs / 60)} minutes)

HOOK:
${script.hook}

BODY:
${script.body}

CTA:
${script.cta}

## Evaluation Criteria (score each 0-10)
1. hookStopsScroll (weight 25%): Does the hook create an instant pattern interrupt in the opening 3-5 words? Score 10 if thumb-stopping; score 0 if generic.
${pacingRule}
3. emotionalTrigger (weight 20%): Is at least one of fear, curiosity, surprise, or ambition clearly triggered in the script?
4. keywordDensity (weight 15%): Does the primary topic keyword (or close variant) appear naturally throughout the script?
5. ctaSpecific (weight 10%): Does the CTA ask a specific, engaging question rather than a generic "subscribe / like / share"?
6. hinglishRatio (weight 10%): Is it written in natural Devanagari Hindi (देवनागरी लिपि) with authentic conversational flow and natural developer vocabulary? Score 10 if natural Devanagari Hindi; penalize if stiff or written in Roman Latin script.

## Instructions
- Be honest and strict. A score of 10 means near-perfect on that criterion.
- For each criterion that scores < 6, add a short human-readable explanation to "issues".
- In "rewriteSections", include "hook" if hookStopsScroll < 6, "body" if pacingCheck < 6 or emotionalTrigger < 6, "cta" if ctaSpecific < 6.
- Return ONLY the JSON object matching the schema — no extra text.`;
}

/**
 * ScriptQAAgent evaluates a VideoScript against 6 quality criteria and returns
 * a {@link QAResult} with an overall score, pass/fail status, per-criterion
 * scores, human-readable issues, and a list of sections that need rewriting.
 */
export class ScriptQAAgent {
  constructor(private llm: LLMProvider) {}

  /**
   * Score a completed VideoScript.
   * @param script - The script to evaluate.
   * @param mode - "short" (default) or "long" (10-minute content).
   * @returns A {@link QAResult} with score, criteria, issues, and rewriteSections.
   */
  async evaluate(script: VideoScript, mode: "short" | "long" = "short"): Promise<QAResult> {
    const prompt = buildPrompt(script, mode);

    const raw = await this.llm.generateJSON<{
      hookStopsScroll: number;
      pacingCheck: number;
      emotionalTrigger: number;
      keywordDensity: number;
      ctaSpecific: number;
      hinglishRatio: number;
      issues: string[];
      rewriteSections: ("hook" | "body" | "cta")[];
    }>(prompt, QA_SCHEMA, { temperature: 0.3 });

    const criteria: QAResult["criteria"] = {
      hookStopsScroll: Number(raw?.hookStopsScroll) || 7,
      pacingCheck: Number(raw?.pacingCheck) || 7,
      emotionalTrigger: Number(raw?.emotionalTrigger) || 7,
      keywordDensity: Number(raw?.keywordDensity) || 7,
      ctaSpecific: Number(raw?.ctaSpecific) || 7,
      hinglishRatio: Number(raw?.hinglishRatio) || 7,
    };

    const calculatedScore = computeScore(criteria);
    const score = Number.isFinite(calculatedScore) ? Math.round(calculatedScore) : 75;

    const issues = Array.isArray(raw?.issues)
      ? raw.issues.map(String)
      : raw?.issues
      ? [String(raw.issues)]
      : [];

    let rewriteSections: ("hook" | "body" | "cta")[] = [];
    if (Array.isArray(raw?.rewriteSections)) {
      rewriteSections = raw.rewriteSections.filter((s): s is "hook" | "body" | "cta" =>
        ["hook", "body", "cta"].includes(s as any),
      );
    } else if (typeof raw?.rewriteSections === "string") {
      rewriteSections = (raw.rewriteSections as string)
        .split(/[\s,]+/)
        .filter((s): s is "hook" | "body" | "cta" => ["hook", "body", "cta"].includes(s as any));
    }

    return {
      score,
      passed: score >= 75,
      criteria,
      issues,
      rewriteSections,
    };
  }
}
