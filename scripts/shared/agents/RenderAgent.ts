import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { FactoryVideoJSON } from "../types";
import { PATHS, VIDEO, BRAND } from "../config";
import { addBranding } from "../branding";

export class RenderAgent {
  async render(videoJSON: FactoryVideoJSON, testFrames?: number): Promise<string> {
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
        if (path.resolve(scene.imagePath) !== path.resolve(dest)) {
          fs.copyFileSync(scene.imagePath, dest);
        }
        return { ...scene, imagePath: `content/factory/${slug}/images/${path.basename(scene.imagePath)}` };
      }
      return scene;
    });

    // Copy voiceover → relative path
    let publicVoicePath = "";
    if (voice && fs.existsSync(voice)) {
      const destVoice = path.join(publicDir, "voiceover.mp3");
      if (path.resolve(voice) !== path.resolve(destVoice)) {
        fs.copyFileSync(voice, destVoice);
      }
      publicVoicePath = `content/factory/${slug}/voiceover.mp3`;
    }

    // Derive fps + frame count from mode: long = 30fps landscape (1920x1080), short = 30fps portrait (1080x1920)
    const isLong =
      (videoJSON as { mode?: string })?.mode === "long" ||
      (videoJSON.script as { mode?: string })?.mode === "long" ||
      videoJSON.publishMode === "day1-long";
    const renderFps = isLong ? VIDEO.longForm.fps : VIDEO.fps;
    const width = isLong ? VIDEO.longForm.width : VIDEO.width;
    const height = isLong ? VIDEO.longForm.height : VIDEO.height;
    const totalFrames = testFrames && testFrames > 0
      ? testFrames
      : Math.ceil((videoJSON.duration + 2) * renderFps);

    // Write public JSON with updated paths
    const publicJSON = {
      ...videoJSON,
      mode: isLong ? "long" : "short",
      fps: renderFps,
      totalFrames,
      scenes: updatedScenes,
      voice: publicVoicePath,
      wordTimings,
    };
    fs.writeFileSync(path.join(publicDir, "video.json"), JSON.stringify(publicJSON, null, 2));

    // ── 2. Remotion render (video without audio) ──────────────────────────────
    fs.mkdirSync(PATHS.videos, { recursive: true });
    const silentPath = path.join(PATHS.videos, `${slug}-silent.mp4`);

    const props = JSON.stringify({ slug, videoPath: `content/factory/${slug}/video.json` });
    const escapedProps = props.replace(/'/g, "'\\''");

    console.log(`\n  Remotion: rendering ${totalFrames} frames (${width}x${height} ${isLong ? "landscape" : "portrait"})...`);
    execSync(
      `npx remotion render FactoryVideo "${silentPath}" --width=${width} --height=${height} --concurrency=2 --duration-in-frames=${totalFrames} --props='${escapedProps}'`,
      { stdio: "inherit", cwd: PATHS.root },
    );

    // ── 3. Audio handling: preserve Remotion audio mix (BGM + SFX + VO) ─────
    const mergedPath = path.join(PATHS.videos, `${slug}-merged.mp4`);
    const hasVoice = publicVoicePath && fs.existsSync(path.join(PATHS.public, publicVoicePath));

    const hasRenderedAudio = (() => {
      try {
        const out = execSync(
          `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${silentPath}"`,
          { encoding: "utf-8" },
        ).trim();
        return out.length > 0;
      } catch {
        return false;
      }
    })();

    if (hasRenderedAudio) {
      // Remotion already rendered complete mix (voice + BGM + SFX) — preserve it!
      fs.renameSync(silentPath, mergedPath);
    } else if (hasVoice) {
      const voiceAbs = path.join(PATHS.public, publicVoicePath);
      execSync(
        `ffmpeg -y -i "${silentPath}" -i "${voiceAbs}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${mergedPath}"`,
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
    
    // Apply logo branding overlay
    addBranding(finalPath);

    fs.copyFileSync(finalPath, outPath);

    return finalPath;
  }
}
