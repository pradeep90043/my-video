import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";

export interface OmniVoiceLine {
  name: string;
  text: string;
  speaker?: string;
  emotion?: string;
}

export interface KaggleOmniVoiceJob {
  tag: string;
  language: string;
  speed: number;
  format: "mp3" | "wav";
  narrator?: string;
  characters?: Record<string, string>;
  lines: OmniVoiceLine[];
}

const RUNNER_SCRIPT = path.join(__dirname, "../omnivoice_runner.py");
const POLL_MS = 15000;
const STALE_STATUS_MS = 90000;

export const kaggleUser = (env = process.env): string => env.KAGGLE_USERNAME || "spam2kaggle";

export function parseKernelStatus(out: string): string {
  const m = /status\s+"?(?:KernelWorkerStatus\.)?([A-Za-z_]+)"?\s*$/m.exec(out.trim());
  return m ? m[1].toLowerCase() : "unknown";
}

export function embedJob(runnerSource: string, job: KaggleOmniVoiceJob): string {
  const marker = "JOB_JSON = None";
  if (!runnerSource.includes(marker)) throw new Error("omnivoice_runner.py has no JOB_JSON marker");
  return runnerSource.replace(marker, `JOB_JSON = json.loads(${JSON.stringify(JSON.stringify(job))})`);
}

export function kernelMetadata(slot: string, env = process.env) {
  return {
    id: `${kaggleUser(env)}/${slot}`,
    title: slot,
    code_file: "runner.py",
    language: "python",
    kernel_type: "script",
    is_private: true,
    enable_gpu: true,
    enable_internet: true,
    machine_shape: "NvidiaTeslaT4",
    dataset_sources: [`${kaggleUser(env)}/voice-samples`],
    competition_sources: [],
    kernel_sources: [],
  };
}

function kaggle(args: string[], timeoutMs = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.env.KAGGLE_CLI || "kaggle", args, { env: process.env });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`kaggle ${args.slice(0, 2).join(" ")} exited ${code}: ${out.trim().slice(-300)}`));
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runOmniVoiceOnKaggle(
  job: KaggleOmniVoiceJob,
  outputDir: string,
  opts: { slot?: string; giveUpMs?: number } = {},
): Promise<string[]> {
  const slot = opts.slot || "ov-dev-slot-1";
  const kernel = `${kaggleUser()}/${slot}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `ov-${slot}-`));

  console.log(`  [OmniVoice-Kaggle] Packaging ${job.lines.length} lines for ${kernel}...`);
  fs.writeFileSync(path.join(tmp, "runner.py"), embedJob(fs.readFileSync(RUNNER_SCRIPT, "utf8"), job));
  fs.writeFileSync(path.join(tmp, "kernel-metadata.json"), JSON.stringify(kernelMetadata(slot), null, 2));

  console.log(`  [OmniVoice-Kaggle] Pushing job to Kaggle GPU (${slot})...`);
  const pushed = await kaggle(["kernels", "push", "-p", tmp]);
  if (!/successfully pushed/i.test(pushed)) throw new Error(`Kaggle push failed: ${pushed.trim().slice(-300)}`);

  const started = Date.now();
  const giveUp = opts.giveUpMs ?? 25 * 60_000;
  let seenRunning = false;

  for (;;) {
    if (Date.now() - started > giveUp) {
      throw new Error(`Kaggle ${kernel} exceeded timeout of ${Math.round(giveUp / 60000)} minutes`);
    }
    await sleep(POLL_MS);
    let status = "unknown";
    try {
      status = parseKernelStatus(await kaggle(["kernels", "status", kernel], 60000));
    } catch (err: any) {
      console.warn(`  [OmniVoice-Kaggle] status probe: ${err.message || err}`);
      continue;
    }

    if (status === "running" || status === "queued") seenRunning = true;
    const fresh = seenRunning || Date.now() - started > STALE_STATUS_MS;
    if (!fresh) continue;

    console.log(`  [OmniVoice-Kaggle] Status: ${status} (${Math.round((Date.now() - started) / 1000)}s elapsed)...`);

    if (status === "error" || status === "cancelacknowledged" || status === "cancelrequested") {
      throw new Error(`Kaggle ${kernel} ended with status ${status}: https://www.kaggle.com/code/${kernel}`);
    }
    if (status === "complete") break;
  }

  console.log(`  [OmniVoice-Kaggle] Job complete. Downloading generated audio files...`);
  fs.mkdirSync(outputDir, { recursive: true });
  await kaggle(["kernels", "output", kernel, "-p", outputDir], 10 * 60_000);

  // Return downloaded audio files
  const generatedFiles = job.lines.map((l) => path.join(outputDir, `${l.name}.${job.format}`));
  const missing = generatedFiles.filter((f) => !fs.existsSync(f));
  if (missing.length > 0) {
    throw new Error(`Kaggle OmniVoice output missing ${missing.length} files: ${missing.slice(0, 3).join(", ")}`);
  }

  // Clean up tmp folder
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {}

  return generatedFiles;
}
