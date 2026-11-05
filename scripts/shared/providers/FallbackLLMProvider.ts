import { LLMOptions, LLMProvider } from "./LLMProvider";

export class FallbackLLMProvider implements LLMProvider {
  name: string;

  constructor(private providers: LLMProvider[]) {
    this.name = providers.map((p) => p.name).join(" -> ");
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    let lastError: any;
    for (const p of this.providers) {
      try {
        return await p.generate(prompt, options);
      } catch (err: any) {
        console.warn(`  [LLM] Provider "${p.name}" failed: ${err.message}. Trying next provider...`);
        lastError = err;
      }
    }
    throw lastError;
  }

  async generateJSON<T>(
    prompt: string,
    schema: Record<string, unknown>,
    options?: LLMOptions,
  ): Promise<T> {
    let lastError: any;
    for (const p of this.providers) {
      try {
        return await p.generateJSON<T>(prompt, schema, options);
      } catch (err: any) {
        console.warn(`  [LLM] Provider "${p.name}" failed: ${err.message}. Trying next provider...`);
        lastError = err;
      }
    }
    throw lastError;
  }
}
