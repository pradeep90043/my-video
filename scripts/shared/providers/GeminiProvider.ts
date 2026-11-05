import { LLMOptions, LLMProvider } from "./LLMProvider";
import { MODELS } from "../config";

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private currentModelIndex = 0;
  private fallbackModels = [
    MODELS.gemini,
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.5-pro",
  ];

  constructor(private apiKey: string = process.env.GEMINI_API_KEY ?? "") {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY not set");
  }

  private get url() {
    const model = this.fallbackModels[this.currentModelIndex] || "gemini-2.5-flash-lite";
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
  }

  private async fetchWithRetry(body: Record<string, unknown>, maxRetries = 3): Promise<Response> {
    let delayMs = 1200;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) return res;

      // If 429 Quota exhausted on current model, switch to next model in pool
      if (res.status === 429 && this.currentModelIndex < this.fallbackModels.length - 1) {
        this.currentModelIndex++;
        const nextModel = this.fallbackModels[this.currentModelIndex];
        console.warn(`  [Gemini] Quota limit hit on previous model. Switching to backup: ${nextModel}...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Retry on 503 (high demand)
      if (res.status === 503 && attempt < maxRetries) {
        console.warn(`  [Gemini] HTTP 503 encountered, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
        continue;
      }

      const errText = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${errText}`);
    }
    throw new Error("Gemini API request failed after retries.");
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<string> {
    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.85,
        maxOutputTokens: options.maxTokens ?? 8192,
      },
    };
    const res = await this.fetchWithRetry(body);
    const data = (await res.json()) as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  async generateJSON<T>(
    prompt: string,
    schema: Record<string, unknown>,
    options: LLMOptions = {},
  ): Promise<T> {
    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.85,
        maxOutputTokens: options.maxTokens ?? 8192,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };
    const res = await this.fetchWithRetry(body);
    const data = (await res.json()) as any;
    const part = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!part) {
      const reason = data.candidates?.[0]?.finishReason ?? "UNKNOWN";
      throw new Error(`Gemini returned empty content (finishReason: ${reason})`);
    }

    let cleaned = part.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    }

    try {
      return JSON.parse(cleaned) as T;
    } catch (parseErr: any) {
      throw new Error(`Failed to parse Gemini JSON: ${parseErr.message}\nRaw response:\n${cleaned.slice(0, 500)}`);
    }
  }
}
