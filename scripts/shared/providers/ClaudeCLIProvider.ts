import { spawn } from "child_process";
import { LLMOptions, LLMProvider } from "./LLMProvider";

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per call

/**
 * Uses the Claude Code CLI (`claude -p`) — no API key needed.
 * Free with a Claude.ai subscription.
 */
export class ClaudeCLIProvider implements LLMProvider {
  name = "claude-cli";

  private run(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        "claude",
        ["-p", prompt, "--output-format", "text"],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error(`Claude CLI timed out after ${TIMEOUT_MS / 1000}s`));
      }, TIMEOUT_MS);

      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Claude CLI exited ${code}: ${stderr.trim()}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async generate(prompt: string, _options: LLMOptions = {}): Promise<string> {
    return this.run(prompt);
  }

  async generateJSON<T>(
    prompt: string,
    schema: Record<string, unknown>,
    _options: LLMOptions = {},
  ): Promise<T> {
    const schemaHint = JSON.stringify(schema, null, 2);
    const jsonPrompt =
      `${prompt}\n\nYou MUST respond with ONLY valid JSON that exactly matches this JSON Schema (use the exact property names):\n${schemaHint}\n\nNo markdown, no code fences, no explanation. Raw JSON only.`;
    const raw = await this.run(jsonPrompt);
    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/```\s*$/m, "")
      .trim();
    return JSON.parse(cleaned) as T;
  }
}
