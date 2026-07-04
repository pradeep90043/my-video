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

    const prompt = `You are a viral tech content strategist for CodeOrCap — an Indian developer YouTube Shorts channel.

Generate 5 fresh viral topic ideas for short-form video (30-60 seconds).

Categories to use: ${cats.join(", ")}
Already used (AVOID): ${avoidList || "none yet"}

Requirements:
- Each topic must be a bold debatable tech claim (e.g. "MERN Stack Is Outdated", "ChatGPT Will Replace Developers")
- Must resonate with Indian software engineers, freshers, React/JS developers
- High viral potential — controversial, surprising, or myth-busting
- viralScore 1-10 (10 = maximum viral potential)
- hook: 1 punchy Hinglish sentence that grabs attention immediately

Return top 5 topics sorted by viralScore descending.`;

    const result = await this.llm.generateJSON<{ topics: TopicResult[] }>(
      prompt,
      TOPIC_SCHEMA,
      { temperature: 0.9 },
    );

    const best = result.topics.sort((a, b) => b.viralScore - a.viralScore)[0];
    this.saveUsedTopic(best.topic);
    return best;
  }
}
