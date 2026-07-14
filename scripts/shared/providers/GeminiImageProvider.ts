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

    const suffix = "in a consistent hand-cut collage style with white torn paper edges, isolated on transparent background, high resolution, flat design aesthetic.";
    let finalPrompt = prompt.trim();
    if (!finalPrompt.toLowerCase().includes("hand-cut collage style")) {
      if (finalPrompt.endsWith(".")) {
        finalPrompt = finalPrompt.slice(0, -1);
      }
      finalPrompt = `${finalPrompt}, ${suffix}`;
    }

    const isImagen = MODELS.imageModel.includes("imagen-");

    if (isImagen) {
      // Imagen Model predict API structure
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.imageModel}:predict?key=${this.apiKey}`;
      
      let aspectRatio = "16:9";
      if (finalPrompt.toLowerCase().includes("9:16") || finalPrompt.toLowerCase().includes("portrait")) {
        aspectRatio = "9:16";
      } else if (finalPrompt.toLowerCase().includes("1:1")) {
        aspectRatio = "1:1";
      }

      const body = {
        instances: [
          {
            prompt: finalPrompt,
          },
        ],
        parameters: {
          sampleCount: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: aspectRatio,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini Imagen API error: ${res.status} ${err}`);
      }

      const data = (await res.json()) as any;
      const base64Data = data.predictions?.[0]?.bytesBase64Encoded;

      if (!base64Data) {
        throw new Error("No image bytes returned from Gemini Imagen API. Response: " + JSON.stringify(data));
      }

      const imageData = Buffer.from(base64Data, "base64");
      fs.writeFileSync(outputPath, imageData);
      return outputPath;
    } else {
      // Multimodal Gemini Model generateContent structure
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.imageModel}:generateContent?key=${this.apiKey}`;
      const body = {
        contents: [{ parts: [{ text: finalPrompt }] }],
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

      const data = (await res.json()) as any;
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

      if (!imagePart) throw new Error("No image returned from Gemini");

      const imageData = Buffer.from(imagePart.inlineData.data, "base64");
      fs.writeFileSync(outputPath, imageData);
      return outputPath;
    }
  }
}
