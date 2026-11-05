import * as fs from "fs";
import * as path from "path";
import { RenderAgent } from "./agents/RenderAgent";
import { FactoryVideoJSON } from "./types";
import { PATHS } from "./config";

async function main() {
  const slug = process.argv[2] || "react-vs-vue-india-startups-2025";
  const jsonPath = path.join(PATHS.public, "content", "factory", slug, "video.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: ${jsonPath} not found!`);
    process.exit(1);
  }

  const videoJSON: FactoryVideoJSON = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Starting render for slug: ${slug}`);
  console.log(`Duration: ${videoJSON.duration}s | Total frames: ${(videoJSON as any).totalFrames || 'auto'}`);

  const agent = new RenderAgent();
  const outPath = await agent.render(videoJSON);
  console.log(`\n Render complete! File: ${outPath}`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
