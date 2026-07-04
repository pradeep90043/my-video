import Anthropic from "@anthropic-ai/sdk";
import { LLMOptions, LLMProvider } from "./LLMProvider";
import { MODELS } from "../config";

export class ClaudeProvider implements LLMProvider {
  name = "claude";
  private client: Anthropic;

  constructor(apiKey: string = process.env.ANTHROPIC_API_KEY ?? "") {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<string> {
    const msg = await this.client.messages.create({
      model: MODELS.claude,
      max_tokens: options.maxTokens ?? 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    return block.type === "text" ? block.text : "";
  }

  async generateJSON<T>(
    prompt: string,
    _schema: Record<string, unknown>,
    options: LLMOptions = {},
  ): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond with ONLY valid JSON, no markdown, no explanation.`;
    const raw = await this.generate(jsonPrompt, options);
    const cleaned = raw.replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();
    return JSON.parse(cleaned) as T;
  }
}
