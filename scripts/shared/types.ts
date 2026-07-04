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

export const SceneSchema = z.object({
  id: z.string(),
  duration: z.number().min(2).max(15),
  text: z.string(),
  voiceText: z.string(),
  subtitle: z.string(),
  imagePrompt: z.string(),
  imagePath: z.string().default(""),
  audioPart: z.string().default(""),
  animation: AnimationTypeSchema.default("fade"),
  background: z.string().default("#0B0B0B"),
  cameraMove: CameraMoveSchema.default("static"),
});

export const VideoScriptSchema = z.object({
  hook: z.string(),
  body: z.string(),
  cta: z.string(),
  durationSecs: z.number().min(30).max(60),
  topic: z.string(),
  category: z.string(),
});

export const VideoMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  hashtags: z.array(z.string()),
  filename: z.string(),
  slug: z.string(),
});

export const FactoryVideoJSONSchema = z.object({
  id: z.string(),
  title: z.string(),
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
});

export type AnimationType = z.infer<typeof AnimationTypeSchema>;
export type CameraMove = z.infer<typeof CameraMoveSchema>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
export type FactoryVideoJSON = z.infer<typeof FactoryVideoJSONSchema>;

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  responseSchema?: Record<string, unknown>;
}
