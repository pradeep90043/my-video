#!/usr/bin/env tsx
/**
 * CodeOrCap Video Factory — HTTP API Server
 *
 * Wraps the pipeline as a REST API so n8n (or any HTTP client) can trigger
 * generation, poll job status, and retrieve results.
 *
 * Usage:  npm run server
 * Port:   3001 (override with PORT env var)
 *
 * Endpoints:
 *   GET  /health                         — liveness check
 *   POST /api/generate                   — start async job, returns { jobId }
 *   POST /api/generate/sync              — run pipeline, wait, return result (used by n8n)
 *   GET  /api/jobs/:id                   — poll async job status
 *   GET  /api/videos                     — list all generated videos
 */

import express, { type Request, type Response } from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config({ quiet: true } as any);

import { PATHS } from "./config";
import { runPipeline, type PipelineOptions, type PipelineResult } from "./pipeline";
import type { Category } from "./config";
import { publishReel, sendDM, replyToComment } from "./instagram";
import { uploadVideoToYouTube } from "./youtube";

// ── Job store ─────────────────────────────────────────────────────────────────

type JobStatus = "pending" | "running" | "done" | "error";

interface Job {
  id: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  options: PipelineOptions;
  result?: PipelineResult;
  error?: string;
  logs: string[];
}

const jobs = new Map<string, Job>();

function createJob(opts: PipelineOptions): Job {
  const job: Job = {
    id: randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    options: opts,
    logs: [],
  };
  jobs.set(job.id, job);
  return job;
}

function buildPipelineOpts(job: Job): PipelineOptions {
  return {
    ...job.options,
    onStep: (step, total, label) => job.logs.push(`[${step}/${total}] ${label}`),
    onStepDone: (detail) => job.logs.push(`  ✓ ${detail}`),
    onWarn: (detail) => job.logs.push(`  ⚠ ${detail}`),
    onLog: (msg) => job.logs.push(`  ${msg}`),
  };
}

async function runJob(job: Job): Promise<void> {
  job.status = "running";
  job.startedAt = new Date().toISOString();

  try {
    job.result = await runPipeline(buildPipelineOpts(job));
    job.status = "done";
  } catch (err: any) {
    job.error = err.message ?? String(err);
    job.status = "error";
  } finally {
    job.completedAt = new Date().toISOString();
  }
}

// ── Parse generation options from request body ────────────────────────────────

function bodyToOpts(body: Record<string, unknown>): PipelineOptions {
  return {
    topic: typeof body.topic === "string" ? body.topic : undefined,
    category: typeof body.category === "string" ? (body.category as Category) : undefined,
    skipImages: body.skipImages === true || body.skip_images === true,
    skipVoice: body.skipVoice === true || body.skip_voice === true,
    skipRender: body.skipRender === true || body.skip_render === true,
  };
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ── GET /health ───────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", jobs: jobs.size, uptime: process.uptime() });
});

// ── POST /api/generate ────────────────────────────────────────────────────────
// Fire-and-forget: returns jobId immediately, pipeline runs in background.
app.post("/api/generate", (req: Request, res: Response) => {
  const opts = bodyToOpts(req.body ?? {});
  const job = createJob(opts);

  // Run in background (intentionally not awaited)
  runJob(job).catch(() => {});

  res.status(202).json({
    jobId: job.id,
    status: job.status,
    pollUrl: `/api/jobs/${job.id}`,
  });
});

// ── POST /api/generate/sync ───────────────────────────────────────────────────
// Synchronous: waits for the pipeline to finish before responding.
// n8n workflows use this — set HTTP Request timeout to 600000ms.
app.post("/api/generate/sync", async (req: Request, res: Response) => {
  const opts = bodyToOpts(req.body ?? {});
  const job = createJob(opts);

  try {
    await runJob(job);

    if (job.status === "done") {
      res.json({ success: true, jobId: job.id, result: job.result, logs: job.logs });
    } else {
      res.status(500).json({ success: false, jobId: job.id, error: job.error, logs: job.logs });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
app.get("/api/jobs/:id", (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const job = jobs.get(id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    result: job.result,
    error: job.error,
    logs: job.logs,
  });
});

// ── GET /api/videos ───────────────────────────────────────────────────────────
// Lists all generated video JSON files.
app.get("/api/videos", (_req: Request, res: Response) => {
  try {
    const jsonDir = PATHS.json;
    if (!fs.existsSync(jsonDir)) {
      res.json({ videos: [] });
      return;
    }
    const files = fs.readdirSync(jsonDir).filter((f) => f.endsWith(".json"));
    const videos = files.map((f) => {
      try {
        const raw = fs.readFileSync(path.join(jsonDir, f), "utf-8");
        const data = JSON.parse(raw);
        return {
          slug: data.metadata?.slug ?? f.replace(".json", ""),
          title: data.title,
          duration: data.duration,
          createdAt: data.createdAt,
          videoPath: data.voice ? `generated/videos/${data.metadata?.slug}.mp4` : null,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ videos, total: videos.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ── Serve generated outputs publicly ─────────────────────────────────────────
app.use("/out", express.static(path.join(process.cwd(), "out")));

// ── Instagram Publishing Endpoint ─────────────────────────────────────────────
app.post("/api/instagram/publish", async (req: Request, res: Response) => {
  const { caption, videoUrl, igUserId, accessToken } = req.body ?? {};

  const targetIgUserId = igUserId || process.env.INSTAGRAM_USER_ID;
  const targetAccessToken = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!targetIgUserId || !targetAccessToken) {
    res.status(400).json({ error: "Missing Instagram User ID or Access Token. Provide in request body or .env file." });
    return;
  }

  let finalVideoUrl = videoUrl;
  if (!finalVideoUrl) {
    const hostBaseUrl = process.env.PUBLIC_TUNNEL_URL || `http://localhost:${PORT}`;
    finalVideoUrl = `${hostBaseUrl}/out/the-old-postbox-final.mp4`;
  }

  console.log(`[Server] Request to publish Reel: url=${finalVideoUrl}, caption="${caption}"`);

  const result = await publishReel(targetIgUserId, targetAccessToken, finalVideoUrl, caption || "Checkout our new story!");
  if (result.success) {
    res.json({ success: true, mediaId: result.mediaId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// ── Instagram Webhook Verification ────────────────────────────────────────────
app.get("/webhook/instagram", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "storiyum_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhook] Instagram verification successful!");
    res.status(200).send(challenge);
  } else {
    console.warn("[Webhook] Instagram verification failed.");
    res.sendStatus(403);
  }
});

// ── Instagram Webhook Event Processor ─────────────────────────────────────────
app.post("/webhook/instagram", async (req: Request, res: Response) => {
  const body = req.body;

  res.status(200).send("EVENT_RECEIVED");

  if (body.object === "instagram") {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const storyLink = process.env.STORY_FULL_LINK || "https://www.youtube.com/@Storiyum";

    if (!accessToken) {
      console.error("[Webhook] Missing INSTAGRAM_ACCESS_TOKEN to send auto replies.");
      return;
    }

    for (const entry of body.entry) {
      if (entry.messaging) {
        for (const messageEvent of entry.messaging) {
          const senderId = messageEvent.sender?.id;
          const text = messageEvent.message?.text?.trim().toUpperCase();

          if (senderId && text) {
            console.log(`[Webhook] DM received from ${senderId}: "${text}"`);
            
            if (text === "STORY") {
              const reply = `Hi! Thank you for watching. Here is the link to the full story video: ${storyLink} 🍿 Enjoy watching!`;
              await sendDM(senderId, accessToken, reply);
            }
          }
        }
      }

      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "comments") {
            const commentId = change.value?.id;
            const text = change.value?.text?.trim().toUpperCase();
            const fromUser = change.value?.from?.username;

            if (commentId && text) {
              console.log(`[Webhook] Comment received on ${commentId} from ${fromUser}: "${text}"`);

              if (text === "STORY") {
                const publicReply = `Sent you the link in your DM! Please check your inbox 📬`;
                await replyToComment(commentId, accessToken, publicReply);

                const userId = change.value?.from?.id;
                if (userId) {
                  const privateReply = `Hi ${fromUser}! Here is the full story link as requested: ${storyLink} 🎥`;
                  await sendDM(userId, accessToken, privateReply);
                }
              }
            }
          }
        }
      }
    }
  }
});

// ── YouTube Publishing Endpoint ───────────────────────────────────────────────
app.post("/api/youtube/publish", async (req: Request, res: Response) => {
  const { title, description, privacyStatus, filePath } = req.body ?? {};

  const targetFilePath = filePath || path.join(process.cwd(), "out", "the-old-postbox-final.mp4");

  console.log(`[Server] Request to upload video to YouTube: path=${targetFilePath}, title="${title}"`);

  const result = await uploadVideoToYouTube(
    targetFilePath,
    title || "The Old Postbox - A Motivational Story",
    description || "A beautiful story of promises and hope.",
    privacyStatus || "public"
  );

  if (result.success) {
    res.json({ success: true, videoId: result.videoId, watchLink: `https://www.youtube.com/watch?v=${result.videoId}` });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n⚡ CodeOrCap API Server`);
  console.log(`   http://localhost:${PORT}/health`);
  console.log(`   POST http://localhost:${PORT}/api/generate/sync`);
  console.log(`   POST http://localhost:${PORT}/api/generate`);
  console.log(`   GET  http://localhost:${PORT}/api/jobs/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/videos\n`);
});
