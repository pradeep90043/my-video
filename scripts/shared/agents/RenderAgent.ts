import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { FactoryVideoJSON } from "../types";
import { PATHS, VIDEO, BRAND } from "../config";

export class RenderAgent {
  async render(videoJSON: FactoryVideoJSON): Promise<string> {
    const { metadata, voice, wordTimings } = videoJSON;
    const slug = metadata.slug;

    // ── 1. Copy assets to public/ so Remotion's staticFile() can serve them ──
    const publicDir = path.join(PATHS.public, "content", "factory", slug);
    const publicImagesDir = path.join(publicDir, "images");
    fs.mkdirSync(publicImagesDir, { recursive: true });

    // Copy scene images → update paths to relative
    const updatedScenes = videoJSON.scenes.map((scene) => {
      if (scene.imagePath && fs.existsSync(scene.imagePath)) {
        const dest = path.join(publicImagesDir, path.basename(scene.imagePath));
        fs.copyFileSync(scene.imagePath, dest);
        return { ...scene, imagePath: `content/factory/${slug}/images/${path.basename(scene.imagePath)}` };
      }
      return scene;
    });

    // Copy voiceover → relative path
    let publicVoicePath = "";
    if (voice && fs.existsSync(voice)) {
      const destVoice = path.join(publicDir, "voiceover.mp3");
      fs.copyFileSync(voice, destVoice);
      publicVoicePath = `content/factory/${slug}/voiceover.mp3`;
    }

    // Write public JSON with updated paths
    const publicJSON = {
      ...videoJSON,
      scenes: updatedScenes,
      voice: publicVoicePath,
      wordTimings,
    };
    fs.writeFileSync(path.join(publicDir, "video.json"), JSON.stringify(publicJSON, null, 2));

    // ── 2. Remotion render (video without audio) ──────────────────────────────
    fs.mkdirSync(PATHS.videos, { recursive: true });
    const silentPath = path.join(PATHS.videos, `${slug}-silent.mp4`);
    const totalFrames = Math.ceil((videoJSON.duration + 2) * VIDEO.fps);

    const props = JSON.stringify({ slug, videoPath: `content/factory/${slug}/video.json` });
    const escapedProps = props.replace(/'/g, "'\\''");

    console.log(`\n  Remotion: rendering ${totalFrames} frames...`);
    execSync(
      `npx remotion render FactoryVideo "${silentPath}" --concurrency=2 --duration-in-frames=${totalFrames} --props='${escapedProps}'`,
      { stdio: "inherit", cwd: PATHS.root },
    );

    // ── 3. FFmpeg: merge voiceover into video ────────────────────────────────
    const mergedPath = path.join(PATHS.videos, `${slug}-merged.mp4`);
    const hasVoice = publicVoicePath && fs.existsSync(path.join(PATHS.public, publicVoicePath));

    if (hasVoice) {
      const voiceAbs = path.join(PATHS.public, publicVoicePath);
      execSync(
        `ffmpeg -y -i "${silentPath}" -i "${voiceAbs}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${mergedPath}"`,
        { stdio: "pipe" },
      );
      fs.unlinkSync(silentPath);
    } else {
      fs.renameSync(silentPath, mergedPath);
    }

    // ── 4. FFmpeg: append outro clip ─────────────────────────────────────────
    const finalPath = path.join(PATHS.videos, `${slug}.mp4`);
    const outroAbs = BRAND.outroPath.startsWith("/")
      ? BRAND.outroPath
      : path.join(PATHS.root, BRAND.outroPath);

    if (fs.existsSync(outroAbs)) {
      const concatList = path.join(PATHS.videos, `${slug}-concat.txt`);
      const safeMain = mergedPath.replace(/\\/g, "/");
      const safeOutro = outroAbs.replace(/\\/g, "/");
      fs.writeFileSync(concatList, `file '${safeMain}'\nfile '${safeOutro}'\n`);

      execSync(
        `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k "${finalPath}"`,
        { stdio: "pipe" },
      );

      fs.unlinkSync(mergedPath);
      fs.unlinkSync(concatList);
    } else {
      fs.renameSync(mergedPath, finalPath);
    }

    // ── 5. Copy to out/ ───────────────────────────────────────────────────────
    const outPath = path.join(PATHS.out, `${slug}.mp4`);
    fs.mkdirSync(PATHS.out, { recursive: true });
    fs.copyFileSync(finalPath, outPath);

    return finalPath;
  }
}
