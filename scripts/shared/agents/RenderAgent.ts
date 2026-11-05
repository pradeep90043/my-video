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
      let resolved = "";
      if (scene.imagePath && fs.existsSync(scene.imagePath)) {
        resolved = scene.imagePath;
      } else if (scene.imagePath && fs.existsSync(path.join(PATHS.public, scene.imagePath))) {
        resolved = path.join(PATHS.public, scene.imagePath);
      } else if (fs.existsSync(path.join(publicImagesDir, path.basename(scene.imagePath || "")))) {
        resolved = path.join(publicImagesDir, path.basename(scene.imagePath));
      }
      if (resolved) {
        const dest = path.join(publicImagesDir, path.basename(resolved));
        if (path.resolve(resolved) !== path.resolve(dest)) {
          fs.copyFileSync(resolved, dest);
        }
        return { ...scene, imagePath: `content/factory/${slug}/images/${path.basename(resolved)}` };
      }
      return scene;
    });

    // Copy voiceover → relative path (resolve absolute, public-relative, or existing destination)
    let publicVoicePath = "";
    let resolvedVoice = "";
    if (voice && fs.existsSync(voice)) {
      resolvedVoice = voice;
    } else if (voice && fs.existsSync(path.join(PATHS.public, voice))) {
      resolvedVoice = path.join(PATHS.public, voice);
    } else if (fs.existsSync(path.join(publicDir, "voiceover.mp3"))) {
      resolvedVoice = path.join(publicDir, "voiceover.mp3");
    }

    if (resolvedVoice) {
      const destVoice = path.join(publicDir, "voiceover.mp3");
      if (path.resolve(resolvedVoice) !== path.resolve(destVoice)) {
        fs.copyFileSync(resolvedVoice, destVoice);
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
      `npx remotion render FactoryVideo "${silentPath}" --width=${width} --height=${height} --concurrency=4 --duration-in-frames=${totalFrames} --props='${escapedProps}'`,
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

    // Check if voiceover was actually rendered into silentPath (speech volume is > -26 dB; BGM only is ~ -34 dB)
    const isVoiceRendered = (() => {
      if (!hasVoice || !hasRenderedAudio) return false;
      try {
        const out = execSync(
          `ffmpeg -i "${silentPath}" -af "volumedetect" -vn -sn -dn -f null /dev/null 2>&1`,
          { encoding: "utf-8" },
        );
        const match = out.match(/mean_volume:\s*(-?\d+(\.\d+)?)\s*dB/);
        if (match) {
          const meanVol = parseFloat(match[1]);
          return meanVol > -26;
        }
        return false;
      } catch {
        return false;
      }
    })();

    if (isVoiceRendered) {
      // Remotion already rendered complete mix (voice + BGM + SFX) — preserve it!
      fs.renameSync(silentPath, mergedPath);
    } else if (hasVoice && hasRenderedAudio) {
      // Remotion rendered BGM/SFX but dropped voiceover → mix voiceover with Remotion audio!
      const voiceAbs = path.join(PATHS.public, publicVoicePath);
      console.log(`\n  Audio: mixing voiceover (${publicVoicePath}) with Remotion sound design...`);
      execSync(
        `ffmpeg -y -i "${silentPath}" -i "${voiceAbs}" -filter_complex "[0:a]volume=0.35[bg];[1:a]volume=1.0[vo];[vo][bg]amix=inputs=2:duration=first:dropout_transition=2[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k "${mergedPath}"`,
        { stdio: "inherit" },
      );
      fs.unlinkSync(silentPath);
    } else if (hasVoice) {
      const voiceAbs = path.join(PATHS.public, publicVoicePath);
      console.log(`\n  Audio: merging voiceover (${publicVoicePath}) into silent video...`);
      execSync(
        `ffmpeg -y -i "${silentPath}" -i "${voiceAbs}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${mergedPath}"`,
        { stdio: "inherit" },
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
