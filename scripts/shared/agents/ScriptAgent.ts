import { LLMProvider } from "../providers/LLMProvider";
import { VIDEO } from "../config";
import { VideoScript } from "../types";

const SHORT_SCRIPT_SCHEMA = {
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

const LONG_SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          timestamp: { type: "string" },
          durationSecs: { type: "number" },
          voiceText: { type: "string" },
          screenText: { type: "string" },
        },
        required: ["id", "label", "timestamp", "durationSecs", "voiceText", "screenText"],
      },
    },
    body: { type: "string" },
    cta: { type: "string" },
    durationSecs: { type: "number" },
    topic: { type: "string" },
    category: { type: "string" },
  },
  required: ["hook", "sections", "body", "cta", "durationSecs", "topic", "category"],
};

export class ScriptAgent {
  constructor(private llm: LLMProvider) {}

  async generate(
    topic: string,
    category: string,
    mode: "short" | "long" = "short",
    linkedVideoUrl?: string,
    targetDurationSecs?: number,
  ): Promise<VideoScript> {
    if (mode === "long") {
      const defaultDuration =
        Number(process.env.LONG_TARGET_SEC) || (process.env.BOT_ENV === "dev" ? 120 : 600);
      return this.generateLong(topic, category, targetDurationSecs ?? defaultDuration);
    }
    return this.generateShort(topic, category, linkedVideoUrl);
  }

  private async generateShort(
    topic: string,
    category: string,
    linkedVideoUrl?: string,
  ): Promise<VideoScript> {
    const linkedVideoNote = linkedVideoUrl
      ? `\n- This is a Day 2 short. The CTA MUST include: "Full video link description mein hai 👇"\n- Linked full video: ${linkedVideoUrl}`
      : "";

    const prompt = `You are the content writer for CodeOrCap — an Indian developer YouTube Shorts channel.

Write a compelling 30-60 second video script for: "${topic}" (Category: ${category})${linkedVideoNote}

Brand voice:
- Language: Native Devanagari Hindi (देवनागरी लिपि) for voiceover narration (hook, body, cta).
- Format: Write exclusively in Hindi using Devanagari script (e.g., "नमस्ते दोस्तों! आज हम बात करेंगे...").
- Technical Terms: Common tech words (like Cursor AI, React, TypeScript, bug, junior dev) should be written in natural Devanagari transliteration (e.g., कर्सर AI, रिएक्ट, टाइपस्क्रिप्ट, कोड, बग्स, जूनियर डेवलपर). DO NOT use Romanized Latin Hinglish for sentences. OmniVoice TTS requires native Devanagari Hindi for authentic human inflection.
- Tone: Confident, slightly provocative, knowledgeable Indian tech creator
- Text on screen: English or Devanagari concise headline
- Tagline: "Stop Guessing. Start Knowing."

Script structure:
1. HOOK (0-3s): A shocking statement or question in Devanagari Hindi. Must grab in 3 seconds.
2. BODY (3-50s): Single best insight with punchy supporting facts in Devanagari Hindi. Max 2 sentences per point.
3. CTA (50-60s): Strong call to action in Devanagari Hindi — comment, follow, share.${linkedVideoUrl ? ' Must include "पूरा वीडियो देखने के लिए डिस्क्रिप्शन में लिंक चेक करें 👇".' : ""}

Rules:
- hook: Devanagari Hindi (देवनागरी), spoken naturally, 1-2 sentences max
- body: Devanagari Hindi (देवनागरी), mix of facts and narrative
- cta: Devanagari Hindi (देवनागरी), direct, creates engagement
- durationSecs: between ${VIDEO.minDurationSecs} and ${VIDEO.maxDurationSecs}
- topic: verbatim
- category: verbatim`;

    return this.llm.generateJSON<VideoScript>(prompt, SHORT_SCRIPT_SCHEMA, { temperature: 0.8 });
  }

  private async generateLong(topic: string, category: string, targetDurationSecs: number = 600): Promise<VideoScript> {
    const d = targetDurationSecs;
    const dIntro = Math.max(10, Math.round(d * 0.10));
    const dProblem = Math.max(20, Math.round(d * 0.22));
    const dDeep1 = Math.max(25, Math.round(d * 0.25));
    const dDeep2 = Math.max(25, Math.round(d * 0.25));
    const dSolution = Math.max(10, Math.round(d * 0.10));
    const dCta = Math.max(10, d - (dIntro + dProblem + dDeep1 + dDeep2 + dSolution));

    // Speaking rate for OmniVoice Hindi is ~2.5 words/second (~150 words/min)
    const targetWordBudget = Math.round(d * 2.5);
    const sectionBudget = Math.round(targetWordBudget / 6);

    const prompt = `You are the content writer for CodeOrCap — a viral Indian developer YouTube channel.

Write a compelling ${Math.round(d / 60)}-minute (${d} second) long-form video script for: "${topic}" (Category: ${category})

Brand voice:
- Language: Native Devanagari Hindi (देवनागरी लिपि) for all voiceText narration.
- Format: Write exclusively in Hindi using Devanagari script (e.g., "नमस्ते दोस्तों! आज हम बात करेंगे...").
- Technical Terms: Common tech words (like Cursor AI, React, TypeScript, bugs, production, junior dev) should be written in natural Devanagari transliteration or clear context (e.g., कर्सर AI, रिएक्ट, टाइपस्क्रिप्ट, कोड, बग्स, प्रोडक्शन, डेवलपर). DO NOT use Romanized Latin Hinglish for sentences. OmniVoice TTS requires native Devanagari Hindi for authentic human inflection.
- Tone: Confident, slightly provocative, knowledgeable Indian tech creator — like a smart senior dev explaining to juniors
- Text on screen (screenText): English only or Devanagari, concise bullet or headline per section
- Tagline: "Stop Guessing. Start Knowing."

Generate EXACTLY 6 sections in this order:
1. id: "intro"       | label: "Introduction"        | timestamp: "0:00"  | durationSecs: ${dIntro}  — Why this matters, context, hook the viewer in Devanagari Hindi (~${Math.round(dIntro * 2.5)} words)
2. id: "problem"     | label: "The Problem"          | timestamp: "0:${dIntro.toString().padStart(2, "0")}"  | durationSecs: ${dProblem} — The core problem explained with real data/stats in Devanagari Hindi (~${Math.round(dProblem * 2.5)} words)
3. id: "deepdive1"   | label: "Deep Dive Part 1"     | timestamp: "..."  | durationSecs: ${dDeep1} — Deep dive point 1 with surprising stats/examples in Devanagari Hindi (~${Math.round(dDeep1 * 2.5)} words)
4. id: "deepdive2"   | label: "Deep Dive Part 2"     | timestamp: "..."  | durationSecs: ${dDeep2} — Deep dive point 2 with story-telling angle in Devanagari Hindi (~${Math.round(dDeep2 * 2.5)} words)
5. id: "solution"    | label: "What To Do Instead"   | timestamp: "..."  | durationSecs: ${dSolution}  — Actionable steps, what developers should actually do in Devanagari Hindi (~${Math.round(dSolution * 2.5)} words)
6. id: "cta"         | label: "Final Thoughts"       | timestamp: "..."  | durationSecs: ${dCta}  — Specific thought-provoking comment prompt question + subscribe ask in Devanagari Hindi (~${Math.round(dCta * 2.5)} words)

Rules:
- voiceText: Pure Devanagari Hindi (देवनागरी लिपि), spoken naturally as if talking to a friend
- TOTAL SPOKEN WORDS BUDGET: Target around ${targetWordBudget} words total across all 6 sections combined (~${sectionBudget} words per section). Keep the narration concise and tightly paced so speech matches the ${d}-second duration.
- screenText: English only, concise bullet or headline per section
- hook: Leave as a single impactful opening statement in Devanagari Hindi (the hook that plays before intro)
- body: Will be auto-generated as concatenation of all sections — do NOT include separately
- cta: Must be identical to sections[5].voiceText in Devanagari Hindi
- durationSecs: ${d}
- topic: verbatim
- category: verbatim
- Make each section substantial — pacing strictly matched for a ${d}-second video`;

    interface LongScriptRaw {
      hook: string;
      sections: Array<{
        id: string;
        label: string;
        timestamp: string;
        durationSecs: number;
        voiceText: string;
        screenText: string;
      }>;
      cta: string;
      durationSecs: number;
      topic: string;
      category: string;
    }

    const raw = await this.llm.generateJSON<LongScriptRaw>(prompt, LONG_SCRIPT_SCHEMA, {
      temperature: 0.8,
    });

    const safeSections = Array.isArray(raw?.sections) ? raw.sections : [];
    // Build body as concatenation of all section voiceTexts
    const body = safeSections.map((s) => `[${s.label || "Scene"} ${s.timestamp || "0:00"}]\n${s.voiceText || ""}`).join("\n\n");

    // cta mirrors the last section (index 5)
    const ctaSection = safeSections[5] ?? safeSections[safeSections.length - 1];
    const cta = ctaSection?.voiceText ?? raw?.cta ?? "कमेंट्स में अपनी राय जरूर बताएं और चैनल को सब्सक्राइब करें!";
    const hook = raw?.hook || (safeSections[0]?.voiceText ? safeSections[0].voiceText.slice(0, 100) : "क्या आपको पता है 2025 में कोडिंग का तरीका पूरी तरह बदल चुका है?");

    return {
      hook,
      body: body || (raw as any)?.body || hook,
      cta,
      durationSecs: d,
      topic: raw?.topic || topic,
      category: raw?.category || category,
      mode: "long" as const,
    };
  }
}
