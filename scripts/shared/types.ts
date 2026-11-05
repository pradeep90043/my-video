import { z } from "zod";

export const AnimationTypeSchema = z.enum([
  "fade",
  "slide",
  "scale",
  "pop",
  "typing",
  "zoom",
]);

export const CameraMoveSchema = z.enum([
  "static",
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "shake",
]);

export const WordTimingSchema = z.object({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

export const FigureItemSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  secondary: z.string().optional(),
  color: z.enum(["primary", "accent", "danger", "success", "warning", "purple"]).default("primary"),
  icon: z.string().optional(),
});

export const SceneFigureSchema = z.object({
  type: z.enum(["comparison", "stats", "roadmap", "metric", "alert", "poll", "code"]),
  title: z.string(),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  items: z.array(FigureItemSchema).default([]),
  highlight: z.string().optional(),
});
export type SceneFigure = z.infer<typeof SceneFigureSchema>;

export const SceneSchema = z.object({
  id: z.string(),
  duration: z.number().min(2).max(60),
  text: z.string(),
  voiceText: z.string(),
  subtitle: z.string(),
  imagePrompt: z.string(),
  imagePath: z.string().default(""),
  audioPart: z.string().default(""),
  animation: AnimationTypeSchema.default("fade"),
  background: z.string().default("#0B0B0B"),
  cameraMove: CameraMoveSchema.default("static"),
  figure: SceneFigureSchema.optional(),
});

export const VideoScriptSchema = z.object({
  hook: z.string(),
  body: z.string(),
  cta: z.string(),
  durationSecs: z.number().min(30).max(660),
  topic: z.string(),
  category: z.string(),
  mode: z.enum(["long", "short"]).default("short"),
  sections: z.array(z.object({
    id: z.string(),
    label: z.string(),
    startTime: z.string(),   // "00:00"
    endTime: z.string(),     // "02:30"
    durationSecs: z.number(),
    voiceText: z.string(),
  })).optional(),
});

export const VideoMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  hashtags: z.array(z.string()),
  filename: z.string(),
  slug: z.string(),
  chapterTimestamps: z.array(z.object({
    time: z.string(),   // "00:00"
    label: z.string(),
  })).optional(),
  linkedVideoUrl: z.string().optional(),
});

export const FactoryVideoJSONSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.enum(["long", "short"]).default("short"),
  script: VideoScriptSchema,
  voice: z.string().default(""),
  thumbnail: z.string().default(""),
  duration: z.number(),
  scenes: z.array(SceneSchema),
  subtitlePath: z.string().default(""),
  wordTimings: z.array(WordTimingSchema).default([]),
  musicTrack: z.string().default(""),
  metadata: VideoMetadataSchema,
  createdAt: z.string(),
  channel: z.string().default(""),
  publishMode: z.enum(["day1-long", "day2-short"]).default("day2-short"),
});

export type AnimationType = z.infer<typeof AnimationTypeSchema>;
export type CameraMove = z.infer<typeof CameraMoveSchema>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
export type FactoryVideoJSON = z.infer<typeof FactoryVideoJSONSchema>;

export type VideoSection = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  durationSecs: number;
  voiceText: string;
};

export type PublishMode = "day1-long" | "day2-short";

export interface TopicState {
  currentTopic: string;
  currentCategory: string;
  channel: string;
  publishMode: PublishMode;
  longVideoId: string;
  longVideoUrl: string;
  publishedAt: string;
  nextPublishAfter: string;
  slug: string;
  analyticsSnapshot: {
    views24h: number;
    avgViewDuration: number;
    stayToWatchRate: number;
  };
}

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  responseSchema?: Record<string, unknown>;
}
