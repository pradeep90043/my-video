import * as fs from "fs";
import * as path from "path";
import { ImageProvider } from "./LLMProvider";
import { MODELS } from "../config";

export class GeminiImageProvider implements ImageProvider {
  name = "gemini-image";

  constructor(private apiKey: string = process.env.GEMINI_API_KEY ?? "") {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY not set");
  }

  async generate(prompt: string, outputPath: string): Promise<string> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.imageModel}:generateContent?key=${this.apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini image API error: ${res.status} ${err}`);
    }

    const data = await res.json() as any;
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart) throw new Error("No image returned from Gemini");

    const imageData = Buffer.from(imagePart.inlineData.data, "base64");
    fs.writeFileSync(outputPath, imageData);
    return outputPath;
  }
}
