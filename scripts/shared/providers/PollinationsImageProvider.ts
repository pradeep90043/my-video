import * as fs from "fs";
import * as path from "path";
import { ImageProvider } from "./LLMProvider";

export class PollinationsImageProvider implements ImageProvider {
  name = "pollinations-image";

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

    const cleanPrompt = finalPrompt.replace(/\s+/g, " ").trim();
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&nologo=true&seed=${Date.now()}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Pollinations API error: ${res.status} ${res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }
}
