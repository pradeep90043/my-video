/**
 * Upload the finished long video straight from the cloud runner to YouTube, so the dashboard server
 * never has to download and unpack the rendered file.
 *
 * No YouTube secret lives in this repo or in its Actions secrets. The dashboard hands the runner a
 * short-lived access token for the channel chosen on the job:
 *
 *   POST <PUBLISH_URL> {slug, token, action: "token"}
 *        -> {accessToken, title, description, tags, privacy, categoryId, madeForKids}
 *   ... resumable upload to the YouTube Data API ...
 *   POST <PUBLISH_URL> {slug, token, action: "done", videoId, url}      (or action: "failed", error)
 *
 * `token` is the per-job progress token the dashboard already issued for this run.
 * The step is best effort: any failure is reported and exits 0, the rendered mp4 is still uploaded
 * as a workflow artifact, so the dashboard can fall back to downloading it.
 *
 * Usage: PUBLISH_URL=... PUBLISH_TOKEN=... npx tsx scripts/longs/publish-youtube.ts --project <slug>
 */
import fs from "node:fs";
import path from "node:path";

const CHUNK = 16 * 1024 * 1024; // must be a multiple of 256 KiB
const TRIES = 5;

type Grant = {
  accessToken: string;
  title: string;
  description?: string;
  tags?: string[];
  privacy?: "private" | "unlisted" | "public";
  categoryId?: string;
  madeForKids?: boolean;
};

const argValue = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(what: string, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i < TRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      console.warn(`${what} failed (attempt ${i + 1}/${TRIES}): ${err instanceof Error ? err.message : err}`);
      await sleep(Math.min(30_000, 2_000 * 2 ** i));
    }
  }
  throw last;
}

async function main() {
  const project = argValue("--project");
  const publishUrl = process.env.PUBLISH_URL;
  const publishToken = process.env.PUBLISH_TOKEN;
  if (!publishUrl || !publishToken) {
    console.log("No publish_url / token: nothing to upload to YouTube from the runner.");
    return;
  }
  if (!project) throw new Error("--project is required");
  const file = argValue("--file") ?? path.join("out", `${project}.mp4`);
  if (!fs.existsSync(file)) throw new Error(`rendered video not found: ${file}`);
  const size = fs.statSync(file).size;

  const call = async (body: Record<string, unknown>) => {
    const res = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: project, token: publishToken, ...body }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`dashboard answered HTTP ${res.status}`);
    return (await res.json()) as any;
  };

  console.log("Asking the dashboard for a short-lived YouTube upload token...");
  const grant = (await withRetry("token request", () => call({ action: "token" }))) as Grant;
  if (!grant?.accessToken || !grant.title) throw new Error("dashboard returned no upload token / title");
  console.log(`::add-mask::${grant.accessToken}`);

  const metadata = {
    snippet: {
      title: grant.title.slice(0, 100),
      description: (grant.description ?? "").slice(0, 5000),
      tags: grant.tags ?? [],
      categoryId: grant.categoryId ?? "27", // Education
    },
    status: {
      privacyStatus: grant.privacy ?? "private",
      selfDeclaredMadeForKids: grant.madeForKids ?? false,
    },
  };

  const init = await withRetry("upload session", async () => {
    const res = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${grant.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(size),
      },
      body: JSON.stringify(metadata),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    const location = res.headers.get("location");
    if (!location) throw new Error("no upload location returned");
    return location;
  });

  console.log(`Uploading ${(size / 1048576).toFixed(1)} MB to YouTube (${metadata.status.privacyStatus})...`);
  const fd = fs.openSync(file, "r");
  let videoId = "";
  try {
    let offset = 0;
    while (offset < size) {
      const end = Math.min(offset + CHUNK, size) - 1;
      const buf = Buffer.alloc(end - offset + 1);
      fs.readSync(fd, buf, 0, buf.length, offset);
      const reply = await withRetry(`chunk ${offset}-${end}`, async () => {
        const res = await fetch(init, {
          method: "PUT",
          headers: {
            "Content-Length": String(buf.length),
            "Content-Range": `bytes ${offset}-${end}/${size}`,
            "Content-Type": "video/mp4",
          },
          body: buf,
          signal: AbortSignal.timeout(10 * 60_000),
        });
        if (res.status === 308) return { done: false as const };
        if (res.ok) return { done: true as const, json: (await res.json()) as any };
        throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      });
      if (reply.done) videoId = reply.json?.id ?? "";
      offset = end + 1;
      console.log(`  ${Math.round((offset / size) * 100)}%`);
    }
  } finally {
    fs.closeSync(fd);
  }

  if (!videoId) throw new Error("YouTube accepted the bytes but returned no video id");
  const url = `https://youtu.be/${videoId}`;
  console.log(`Uploaded: ${url}`);
  await withRetry("report done", () => call({ action: "done", videoId, url, privacy: metadata.status.privacyStatus }));
}

main().catch(async (err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`YouTube upload from the runner failed: ${message}`);
  // best effort: tell the dashboard so it falls back to downloading the artifact
  try {
    if (process.env.PUBLISH_URL && process.env.PUBLISH_TOKEN) {
      await fetch(process.env.PUBLISH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: argValue("--project"), token: process.env.PUBLISH_TOKEN, action: "failed", error: message }),
        signal: AbortSignal.timeout(30_000),
      });
    }
  } catch { /* ignore */ }
  process.exit(0); // never fail the render: the mp4 is still uploaded as an artifact
});
