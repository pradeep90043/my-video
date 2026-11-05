import * as fs from "fs";
import * as path from "path";
import { LLMProvider } from "../providers/LLMProvider";
import { CATEGORIES, PATHS, type Category } from "../config";

interface TopicResult {
  topic: string;
  category: Category;
  hook: string;
  viralScore: number;
}

const TOPIC_SCHEMA = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          category: { type: "string" },
          hook: { type: "string" },
          viralScore: { type: "number" },
        },
        required: ["topic", "category", "hook", "viralScore"],
      },
    },
  },
  required: ["topics"],
};

export class TopicAgent {
  private usedTopicsPath = path.join(PATHS.metadata, "used-topics.json");
  private minViralScore = 8;

  constructor(private llm: LLMProvider) {}

  private loadUsedTopics(): string[] {
    try { return JSON.parse(fs.readFileSync(this.usedTopicsPath, "utf-8")); }
    catch { return []; }
  }

  private saveUsedTopic(topic: string): void {
    const used = this.loadUsedTopics();
    used.push(topic);
    fs.mkdirSync(path.dirname(this.usedTopicsPath), { recursive: true });
    fs.writeFileSync(this.usedTopicsPath, JSON.stringify(used, null, 2));
  }

  async generate(category?: Category): Promise<TopicResult> {
    const used = this.loadUsedTopics();
    const cats = category ? [category] : CATEGORIES;
    const avoidList = used.slice(-20).join(", ");

    const buildPrompt = () => `You are a viral tech content strategist for CodeOrCap — an Indian developer YouTube Shorts channel.

Generate 10 fresh viral topic ideas for short-form video (30-60 seconds) using the following 3 research methods:

1. **Trending** — What's hot in tech / the channel's niche RIGHT NOW (recent frameworks, AI tools, dev drama, layoffs, hype cycles).
2. **Outlier** — Topics that SMALL channels are beating their average performance on (underdog topics with disproportionate reach).
3. **Proven** — Topics that CONSISTENTLY perform across both small AND big channels (evergreen high-CTR formats).

Categories to use: ${cats.join(", ")}
Already used (AVOID): ${avoidList || "none yet"}

Requirements:
- Each topic must be a bold debatable tech claim (e.g. "MERN Stack Is Outdated", "ChatGPT Will Replace Developers")
- Must resonate with Indian software engineers, freshers, React/JS developers
- Primary filter: "curiosity ka bhoot" — the idea must trigger IMMEDIATE curiosity before the viewer even clicks. If a person sees the title and doesn't feel compelled to watch, it fails.
- High viral potential — controversial, surprising, or myth-busting
- viralScore 1-10 (10 = maximum viral potential)
- hook: 1 punchy Hinglish sentence that grabs attention immediately

Return exactly 10 topics sorted by viralScore descending.`;

    const MAX_ATTEMPTS = 3;
    let allTopics: TopicResult[] = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const result = await this.llm.generateJSON<{ topics: TopicResult[] }>(
        buildPrompt(),
        TOPIC_SCHEMA,
        { temperature: 0.9 },
      );

      const sorted = result.topics.sort((a, b) => b.viralScore - a.viralScore);

      // Merge with previously collected topics (keep best across attempts)
      allTopics = [...allTopics, ...sorted].sort((a, b) => b.viralScore - a.viralScore);

      const qualifyingTopic = sorted.find((t) => t.viralScore >= this.minViralScore);
      if (qualifyingTopic) {
        // Found a qualifying topic — use the best qualifying one
        const best = allTopics.find((t) => t.viralScore >= this.minViralScore)!;
        this.saveUsedTopic(best.topic);
        return best;
      }

      console.warn(
        `[TopicAgent] Attempt ${attempt}/${MAX_ATTEMPTS}: no topic reached viralScore >= ${this.minViralScore}. Best so far: ${sorted[0]?.viralScore ?? "N/A"}`,
      );
    }

    // After 3 attempts, pick the absolute best available regardless of score
    const best = allTopics[0];
    console.warn(
      `[TopicAgent] All ${MAX_ATTEMPTS} attempts exhausted without hitting viralScore >= ${this.minViralScore}. Using best available: "${best.topic}" (score: ${best.viralScore})`,
    );
    this.saveUsedTopic(best.topic);
    return best;
  }
}
