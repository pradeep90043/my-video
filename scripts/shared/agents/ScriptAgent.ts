import { LLMProvider } from "../providers/LLMProvider";
import { VIDEO } from "../config";
import { VideoScript } from "../types";

const SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    body: { type: "string" },
    cta: { type: "string" },
    durationSecs: { type: "number" },
    topic: { type: "string" },
    category: { type: "string" },
  },
  required: ["hook", "body", "cta", "durationSecs", "topic", "category"],
};

export class ScriptAgent {
  constructor(private llm: LLMProvider) {}

  async generate(topic: string, category: string): Promise<VideoScript> {
    const prompt = `You are the content writer for CodeOrCap — an Indian developer YouTube Shorts channel.

Write a compelling 30-60 second video script for: "${topic}" (Category: ${category})

Brand voice:
- Language: Hinglish for voiceover (70% Hindi + 30% English natural mix)
- Tone: Confident, slightly provocative, knowledgeable Indian tech creator
- Text on screen: English only
- Tagline: "Stop Guessing. Start Knowing."

Script structure:
1. HOOK (0-5s): A shocking statement or question. Must grab in 3 seconds.
2. BODY (5-50s): 3-4 punchy facts/points with real data. Each point max 2 sentences.
3. CTA (50-60s): Strong call to action — comment, follow, share.

Rules:
- hook: Hinglish, spoken naturally, 1-2 sentences max
- body: Mix of facts and narrative. Hinglish naturally.
- cta: Hinglish, direct, creates engagement
- durationSecs: between ${VIDEO.minDurationSecs} and ${VIDEO.maxDurationSecs}
- topic: verbatim
- category: verbatim`;

    return this.llm.generateJSON<VideoScript>(prompt, SCRIPT_SCHEMA, { temperature: 0.8 });
  }
}
