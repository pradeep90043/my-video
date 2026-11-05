import { LLMProvider } from "../providers/LLMProvider";
import { VideoScript } from "../types";

export interface FactCorrection {
  original: string;
  replacement: string;
  reason: string;
}

export interface FactCheckResult {
  passed: boolean; // accuracyScore >= 75
  accuracyScore: number; // 0-100
  issues: string[];
  corrections: FactCorrection[];
}

const FACT_SCHEMA = {
  type: "object",
  properties: {
    accuracyScore: { type: "number" },
    issues: { type: "array", items: { type: "string" } },
    corrections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          replacement: { type: "string" },
          reason: { type: "string" },
        },
        required: ["original", "replacement", "reason"],
      },
    },
  },
  required: ["accuracyScore", "issues", "corrections"],
};

/**
 * FactCheckAgent — verifies factual assertions, statistics, dates,
 * and library features in scripts. Provides surgical replacements for any
 * false or exaggerated claims without bloating token limits.
 */
export class FactCheckAgent {
  constructor(private llm: LLMProvider) {}

  async verify(script: VideoScript): Promise<FactCheckResult> {
    const prompt = `You are a technical fact-checker and code reviewer for CodeOrCap.

Check this script for technical hallucinations, incorrect stats, or fabricated library claims:

Topic: ${script.topic}
Category: ${script.category}

HOOK:
${script.hook}

BODY:
${script.body}

CTA:
${script.cta}

Instructions:
1. Identify any statements that are factually false, fabricated statistics, or misleading tech claims.
2. If any claim is misleading or false:
   - "original": the exact substring from the script to replace
   - "replacement": the factually accurate wording preserving natural Devanagari Hindi (देवनागरी) and viral punch
   - "reason": brief explanation
3. accuracyScore: 0 to 100 (100 = 100% accurate).
4. If no falsehoods found, return accuracyScore = 95+, empty issues, and empty corrections.

Return ONLY JSON matching the schema.`;

    const res = await this.llm.generateJSON<FactCheckResult>(prompt, FACT_SCHEMA, {
      temperature: 0.2,
    });

    return {
      passed: res.accuracyScore >= 75,
      accuracyScore: res.accuracyScore,
      issues: res.issues || [],
      corrections: res.corrections || [],
    };
  }
}
