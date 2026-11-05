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

  private async fetchWithRetry(body: Record<string, unknown>, maxRetries = 3): Promise<Response> {
    const url = `${this.baseUrl}/chat/completions`;
    let delayMs = 1500;
    let currentModel = (body.model as string) || this.model;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const payload = { ...body, model: currentModel };
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) return res;

        // On 502 (upstream provider error), 503 (high demand), or 429 (rate limit)
        if ((res.status === 502 || res.status === 503 || res.status === 429) && attempt < maxRetries) {
          // If a specific model was pinned, switch to "auto" so FreeLLMAPI routes across healthy providers
          if (currentModel !== "auto") {
            console.warn(`    [${this.name}] Model "${currentModel}" busy (HTTP ${res.status}). Switching to "auto"...`);
            currentModel = "auto";
          }
          console.warn(`    [${this.name}] HTTP ${res.status} encountered, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, delayMs));
          delayMs *= 2;
          continue;
        }

        const errText = await res.text();
        throw new Error(`OpenAICompatible [${this.name}] error ${res.status}: ${errText}`);
      } catch (err: any) {
        if (attempt >= maxRetries) throw err;
        console.warn(`    [${this.name}] Request failed (${err.message}), retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
      }
    }
    throw new Error(`OpenAICompatible [${this.name}] failed after ${maxRetries} retries.`);
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    const res = await this.fetchWithRetry(body);
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
