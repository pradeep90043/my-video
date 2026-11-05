import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true } as any);
dotenv.config({ quiet: true } as any);

export const BRAND = {
  name: "CodeOrCap",
  handle: "@codeorcap",
  primaryColor: "#FFB800",
  accentColor: "#FF8A00",
  bgColor: "#0B0B0B",
  textColor: "#FFFFFF",
  tagline: "Stop Guessing. Start Knowing.",
  logoPath: "public/logo.png",
  outroPath: process.env.OUTRO_PATH ?? "/Users/apple/Documents/end-video-no-watermark.mp4",
  fonts: {
    heading: "Montserrat",
    body: "Inter",
    mono: "Fira Code",
  },
} as const;

export const VIDEO = {
  // Short-form (Shorts/Reels) — portrait
  width: 1080,
  height: 1920,
  fps: 30,
  minDurationSecs: 30,
  maxDurationSecs: 60,
  defaultDurationSecs: 45,
  // Long-form (10-min videos in prod, 2-min in dev/test) — landscape
  longForm: {
    width: 1920,
    height: 1080,
    fps: 30,
    minDurationSecs: process.env.BOT_ENV === "dev" ? 60 : 540,   // 1 min in dev, 9 min in prod
    maxDurationSecs: process.env.BOT_ENV === "dev" ? 180 : 660,  // 3 min in dev, 11 min in prod
    defaultDurationSecs: Number(process.env.LONG_TARGET_SEC) || (process.env.BOT_ENV === "dev" ? 120 : 600), // 2 min test in dev
  },
} as const;

export const PATHS = {
  root: process.cwd(),
  public: path.join(process.cwd(), "public"),
  generated: path.join(process.cwd(), "generated"),
  images: path.join(process.cwd(), "generated", "images"),
  audio: path.join(process.cwd(), "generated", "audio"),
  subtitles: path.join(process.cwd(), "generated", "subtitles"),
  videos: path.join(process.cwd(), "generated", "videos"),
  thumbnails: path.join(process.cwd(), "generated", "thumbnails"),
  scripts: path.join(process.cwd(), "generated", "scripts"),
  json: path.join(process.cwd(), "generated", "json"),
  metadata: path.join(process.cwd(), "generated", "metadata"),
  out: path.join(process.cwd(), "out"),
} as const;

export const MODELS = {
  llm: (process.env.LLM_PROVIDER as "gemini" | "claude" | "claude-cli") ?? "gemini",
  gemini: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  claude: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
  imageModel: process.env.IMAGE_MODEL ?? "imagen-3.0-generate-002",
  // Voice is locked to OmniVoice — VOICE_PROVIDER env var is intentionally ignored now
  voiceProvider: "omni-voice" as const,
} as const;

/** OmniVoice Kaggle/Cloudflare tunnel config — REQUIRED */
export const OMNI_VOICE = {
  /** Tunnel URL set by Kaggle notebook — e.g. https://xxxx.trycloudflare.com */
  url: process.env.OMNI_VOICE_URL?.trim().replace(/\/$/, "") ?? "",
} as const;

export const GOOGLE_TTS = {
  key: process.env.GOOGLE_TTS_API_KEY ?? "",   // matches .env key name
  language: process.env.GOOGLE_TTS_LANGUAGE ?? "en-IN",
  voice: process.env.GOOGLE_TTS_VOICE ?? "en-IN-Neural2-D",  // Indian English female — handles Hinglish naturally
  speakingRate: parseFloat(process.env.GOOGLE_TTS_SPEED ?? "1.0"),
  pitch: parseFloat(process.env.GOOGLE_TTS_PITCH ?? "0"),
} as const;

export const CATEGORIES = [
  "React",
  "JavaScript",
  "TypeScript",
  "AI",
  "Programming",
  "Career",
  "Interview",
  "Startup",
  "Productivity",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const IMAGE_STYLE =
  "in a consistent hand-cut collage style with white torn paper edges, isolated on transparent background, high resolution, flat design aesthetic";

export const CHANNELS = [
  { id: "codeorcap",  name: "CodeOrCap",   niche: "tech/dev",        day1Hour: 9,  day2Hour: 9  },
  { id: "storiyum",   name: "Storiyum",    niche: "stories",         day1Hour: 14, day2Hour: 14 },
  { id: "infoonspot", name: "InfoOnSpot",  niche: "news/AI",         day1Hour: 18, day2Hour: 18 },
  { id: "promptgag",  name: "PromptGag",   niche: "comedy/memes",    day1Hour: 21, day2Hour: 21 },
] as const;

export type ChannelId = typeof CHANNELS[number]["id"];
