export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  responseSchema?: Record<string, unknown>;
}

export interface LLMProvider {
  name: string;
  generate(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON<T>(prompt: string, schema: Record<string, unknown>, options?: LLMOptions): Promise<T>;
}

export interface ImageProvider {
  name: string;
  generate(prompt: string, outputPath: string): Promise<string>;
}

export interface VoiceProvider {
  name: string;
  synthesize(text: string, outputPath: string): Promise<{ path: string; durationSecs: number }>;
}
