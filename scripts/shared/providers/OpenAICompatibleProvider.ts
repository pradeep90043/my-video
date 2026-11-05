import { LLMOptions, LLMProvider } from "./LLMProvider";

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  name?: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  name: string;
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(opts: OpenAICompatibleOptions) {
    this.name = opts.name || "openai-compat";
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.model = opts.model;
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAICompatible [${this.name}] error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content ?? "";
  }

  async generateJSON<T>(
    prompt: string,
    _schema: Record<string, unknown>,
    options: LLMOptions = {}
  ): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY a valid, raw JSON object matching the required schema. Do not include markdown codeblocks (\`\`\`json), explanations, or preamble.`;
    const raw = await this.generate(jsonPrompt, options);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch (e: any) {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
      }
      throw new Error(`Failed to parse JSON response from ${this.name}: ${e.message}\nRaw: ${raw.slice(0, 300)}`);
    }
  }
}
