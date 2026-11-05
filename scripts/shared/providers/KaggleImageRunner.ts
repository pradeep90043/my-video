import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";

export interface KaggleImagePrompt {
  id: string;
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  negative?: string;
}

const RUNNER_SCRIPT = path.join(__dirname, "../image_runner.py");
const POLL_MS = 10000;

export const kaggleUser = (env = process.env): string => env.KAGGLE_USERNAME || "spam2kaggle";

export function parseKernelStatus(out: string): string {
  const m = /status\s+"?(?:KernelWorkerStatus\.)?([A-Za-z_]+)"?\s*$/m.exec(out.trim());
  return m ? m[1].toLowerCase() : "unknown";
}

export function embedPrompts(runnerSource: string, prompts: KaggleImagePrompt[]): string {
  const marker = "PROMPTS = None  # PROMPTS_MARKER";
  if (!runnerSource.includes(marker)) throw new Error("image_runner.py has no PROMPTS marker");
  return runnerSource.replace(marker, `PROMPTS = json.loads(${JSON.stringify(JSON.stringify(prompts))})`);
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
    dataset_sources: [],
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

export async function runKaggleImageGen(
  prompts: KaggleImagePrompt[],
  outputDir: string,
  opts: { slot?: string; giveUpMs?: number } = {},
): Promise<Map<string, string>> {
  const slot = opts.slot || "mv-image-gen";
  const kernel = `${kaggleUser()}/${slot}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `img-${slot}-`));

  console.log(`  [ImageGen-Kaggle] Packaging ${prompts.length} prompts for ${kernel}...`);
  fs.writeFileSync(path.join(tmp, "runner.py"), embedPrompts(fs.readFileSync(RUNNER_SCRIPT, "utf8"), prompts));
  fs.writeFileSync(path.join(tmp, "kernel-metadata.json"), JSON.stringify(kernelMetadata(slot), null, 2));

  console.log(`  [ImageGen-Kaggle] Pushing job to Kaggle GPU (${slot})...`);
  const pushed = await kaggle(["kernels", "push", "-p", tmp]);
  if (!/successfully pushed/i.test(pushed)) throw new Error(`Kaggle push failed: ${pushed.trim().slice(-300)}`);

  const started = Date.now();
  const giveUp = opts.giveUpMs ?? 20 * 60_000;

  for (;;) {
    if (Date.now() - started > giveUp) {
      throw new Error(`Kaggle image job ${kernel} timed out after ${Math.round(giveUp / 60000)}m`);
    }
    await sleep(POLL_MS);

    let statusRaw = "";
    try {
      statusRaw = await kaggle(["kernels", "status", kernel]);
    } catch {
      continue;
    }
    const status = parseKernelStatus(statusRaw);
    const elapsed = Math.round((Date.now() - started) / 1000);

    if (status === "running") {
      console.log(`  [ImageGen-Kaggle] Running on GPU (${elapsed}s)...`);
    } else if (status === "queued") {
      console.log(`  [ImageGen-Kaggle] Queued on Kaggle (${elapsed}s)...`);
    } else if (status === "complete") {
      console.log(`  [ImageGen-Kaggle] Kernel complete in ${elapsed}s. Downloading images...`);
      break;
    } else if (status === "error" || status === "cancel_ack") {
      throw new Error(`Kaggle kernel ${kernel} failed with status: ${status}`);
    }
  }

  const outDir = path.join(tmp, "out");
  fs.mkdirSync(outDir, { recursive: true });
  await kaggle(["kernels", "output", kernel, "-p", outDir]);

  // Find generated PNGs
  const resultMap = new Map<string, string>();
  fs.mkdirSync(outputDir, { recursive: true });

  const searchDir = fs.existsSync(path.join(outDir, "out")) ? path.join(outDir, "out") : outDir;
  const files = fs.readdirSync(searchDir).filter((f) => f.endsWith(".png"));

  for (const f of files) {
    const id = path.basename(f, ".png");
    const dest = path.join(outputDir, f);
    fs.copyFileSync(path.join(searchDir, f), dest);
    resultMap.set(id, dest);
  }

  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {}

  return resultMap;
}
