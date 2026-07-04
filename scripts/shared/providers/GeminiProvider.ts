import { LLMOptions, LLMProvider } from "./LLMProvider";
import { MODELS } from "../config";

export class GeminiProvider implements LLMProvider {
  name = "gemini";

  constructor(private apiKey: string = process.env.GEMINI_API_KEY ?? "") {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY not set");
  }

  private get url() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${this.apiKey}`;
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<string> {
    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.85,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as any;
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
        maxOutputTokens: options.maxTokens ?? 2048,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as any;
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return JSON.parse(raw) as T;
  }
}
