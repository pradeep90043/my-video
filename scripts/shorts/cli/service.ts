import z from "zod";
import * as fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api";
import { IMAGE_HEIGHT, IMAGE_WIDTH } from "../../../src/shared/lib/constants";

// ─── CodeOrCap / Gemini ──────────────────────────────────────────────────────

export const CodeOrCapFullContentSchema = z.object({
  claim: z.string(),
  hook: z.string(),
  verdict: z.enum(["CODE", "CAP", "MIXED"]),
  rating: z.string(),
  winner: z.string(),
  evidence: z.array(z.string()),
  voiceover: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  youtube_title: z.string(),
  youtube_description: z.string(),
  pinned_comment: z.string(),
});

export type CodeOrCapFullContent = z.infer<typeof CodeOrCapFullContentSchema>;

const buildCodeOrCapPrompt = (topic: string) => `
You are the content brain for CodeOrCap — an Indian tech myth-buster YouTube Shorts / Instagram Reels channel.

Brand rules:
- CODE = TRUE (rating 7–10) | MIXED = PARTIALLY TRUE (rating 4–6) | CAP = FALSE (rating 0–3)
- Tagline: "Stop Guessing. Start Knowing."
- Audience: Indian software engineers, frontend devs, React devs, freshers, DSA learners
- Language: Voiceover = Hinglish (70% Hindi + 30% English). Text on screen = English.

Content framework:
1. CLAIM — bold English statement (max 5 words, uppercase-ready, e.g. "MERN Stack Is Outdated")
2. EVIDENCE — exactly 3 factual bullet points (English, punchy, data-backed)
3. VERDICT — CODE / CAP / MIXED
4. RATING — X/10 (number matches verdict range)
5. CODE OR CAP

Hook formula: "Everyone says [CLAIM]. But if that's true… Why does [CONTRADICTION] still exist?"
Hook must be Hinglish, 1–2 punchy sentences, spoken like a confident Indian tech creator.

Reel structure: 20–30 seconds total
- 0–5s  : Hook
- 5–10s : Claim
- 10–20s: Evidence (3 bullet points)
- 20–28s: Verdict + Rating
- 28–30s: Outro

Generate full content for this topic: "${topic}"

Strict rules:
- evidence: exactly 3 items, factual with real data/examples, not opinion
- voiceover: natural Hinglish, ~25 seconds at normal speaking pace (≈90–110 words)
- caption: punchy Hinglish, 1–2 sentences, ends with an emoji or rhetorical question
- hashtags: exactly 9 tags — mix of Hindi (#TechMythBuster, #CodeOrCap) + English (#ReactJS, #WebDev, #IndianDev)
- youtube_title: English, SEO keyword-rich, under 60 characters, include "Code or Cap?"
- youtube_description: ~150 words, English, includes keywords, ends with subscribe CTA
- pinned_comment: Hinglish, creates debate/engagement (ask a question or challenge viewers to answer)
- winner: What the engineer should actually use/do instead (e.g. "MERN + TypeScript + Modern Tooling")
`.trim();

const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    claim: { type: "string" },
    hook: { type: "string" },
    verdict: { type: "string", enum: ["CODE", "CAP", "MIXED"] },
    rating: { type: "string" },
    winner: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    voiceover: { type: "string" },
    caption: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    youtube_title: { type: "string" },
    youtube_description: { type: "string" },
    pinned_comment: { type: "string" },
  },
  required: [
    "claim", "hook", "verdict", "rating", "winner", "evidence",
    "voiceover", "caption", "hashtags", "youtube_title",
    "youtube_description", "pinned_comment",
  ],
};

// ─── Google Cloud TTS ────────────────────────────────────────────────────────

export const HI_IN_VOICES = {
  "hi-IN-Neural2-A": "Female (Neural2 — best quality)",
  "hi-IN-Neural2-B": "Male (Neural2)",
  "hi-IN-Neural2-C": "Male (Neural2 — deeper)",
  "hi-IN-Neural2-D": "Female (Neural2 — softer)",
  "hi-IN-Wavenet-A": "Female (Wavenet — fallback)",
  "hi-IN-Wavenet-B": "Male (Wavenet — fallback)",
} as const;

export type HiInVoice = keyof typeof HI_IN_VOICES;

export const generateGoogleTTSAudio = async (
  text: string,
  apiKey: string,
  outputPath: string,
  voice: HiInVoice = "hi-IN-Neural2-A",
  speakingRate = 1.05,
): Promise<void> => {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: "hi-IN",
        name: voice,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate,
        pitch: 0,
        effectsProfileId: ["headphone-class-device"],
      },
    }),
  });

  if (!res.ok) throw new Error(`Google TTS error: ${await res.text()}`);

  const data = await res.json();
  if (!data.audioContent) throw new Error("No audioContent in TTS response");

  const buffer = Buffer.from(data.audioContent, "base64");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
};

import path from "path";

export const generateCodeOrCapContent = async (
  topic: string,
  geminiApiKey: string,
): Promise<CodeOrCapFullContent> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildCodeOrCapPrompt(topic) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        temperature: 0.85,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${await res.text()}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");

  return CodeOrCapFullContentSchema.parse(JSON.parse(text));
};

export const generateCodeOrCapContentViaClaude = async (
  topic: string,
  anthropicApiKey: string,
): Promise<CodeOrCapFullContent> => {
  const client = new Anthropic({ apiKey: anthropicApiKey });
  const prompt = buildCodeOrCapPrompt(topic) +
    "\n\nReturn ONLY a valid JSON object matching the schema. No markdown, no explanation.";

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (msg.content[0] as { type: string; text: string }).text;
  return CodeOrCapFullContentSchema.parse(JSON.parse(text));
};

export const generateEdgeTTSAudio = async (
  text: string,
  outputMp3Path: string,
  voice = "hi-IN-SwaraNeural",
): Promise<void> => {
  const { execSync } = await import("child_process");
  fs.mkdirSync(path.dirname(outputMp3Path), { recursive: true });
  const escaped = text.replace(/"/g, '\\"');
  execSync(
    `edge-tts --voice "${voice}" --rate "+8%" --text "${escaped}" --write-media "${outputMp3Path}"`,
    { stdio: "pipe" },
  );
};

export const generateMacTTSAudio = async (
  text: string,
  outputMp3Path: string,
): Promise<void> => {
  const { execSync } = await import("child_process");
  const tmpAiff = outputMp3Path.replace(/\.mp3$/, ".aiff");
  fs.mkdirSync(path.dirname(outputMp3Path), { recursive: true });
  execSync(`say -r 160 -o "${tmpAiff}" "${text.replace(/"/g, '\\"')}"`);
  execSync(`ffmpeg -y -i "${tmpAiff}" "${outputMp3Path}" 2>/dev/null`);
  fs.unlinkSync(tmpAiff);
};

let apiKey: string | null = null;

export const setApiKey = (key: string) => {
  apiKey = key;
};

export const openaiStructuredCompletion = async <T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> => {
  const jsonSchema = z.toJSONSchema(schema);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema: {
            type: jsonSchema.type || "object",
            properties: jsonSchema.properties,
            required: jsonSchema.required,
            additionalProperties: jsonSchema.additionalProperties ?? false,
          },
          strict: true,
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);

  const data = await res.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const parsed = JSON.parse(content);
  return schema.parse(parsed);
};

function saveUint8ArrayToPng(uint8Array: Uint8Array, filePath: string) {
  const buffer = Buffer.from(uint8Array);
  fs.writeFileSync(filePath, buffer as Uint8Array);
}

export const generateAiImage = async ({
  prompt,
  path,
  onRetry,
}: {
  prompt: string;
  path: string;
  onRetry: (attempt: number) => void;
}) => {
  const maxRetries = 3;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`,
        response_format: "b64_json",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const buffer = Buffer.from(data.data[0].b64_json, "base64");
      const uint8Array = new Uint8Array(buffer);

      saveUint8ArrayToPng(uint8Array, path);
      return;
    } else {
      lastError = new Error(
        `OpenAI error (attempt ${attempt + 1}): ${await res.text()}`,
      );
      attempt++;
      if (attempt < maxRetries) {
        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      onRetry(attempt);
    }
  }

  // Ran out of retries, throw the last error
  throw lastError!;
};

export const getGenerateStoryPrompt = (title: string, topic: string) => {
  const prompt = `Write a short story with title [${title}] (its topic is [${topic}]).
   You must follow best practices for great storytelling. 
   The script must be 8-10 sentences long. 
   Story events can be from anywhere in the world, but text must be translated into English language. 
   Result result without any formatting and title, as one continuous text. 
   Skip new lines.`;

  return prompt;
};

export const getGenerateImageDescriptionPrompt = (storyText: string) => {
  const prompt = `You are given story text.
  Generate (in English) 5-8 very detailed image descriptions  for this story. 
  Return their description as json array with story sentences matched to images. 
  Story sentences must be in the same order as in the story and their content must be preserved.
  Each image must match 1-2 sentence from the story.
  Images must show story content in a way that is visually appealing and engaging, not just characters.
  Give output in json format:

  [
    {
      "text": "....",
      "imageDescription": "..."
    }
  ]

  <story>
  ${storyText}
  </story>`;

  return prompt;
};

const saveBase64ToMp3 = (data: string, path: string) => {
  const buffer = Buffer.from(data, "base64");
  fs.writeFileSync(path, buffer as Uint8Array);
};

export const generateVoice = async (
  text: string,
  apiKey: string,
  path: string,
): Promise<CharacterAlignmentResponseModel> => {
  const client = new ElevenLabsClient({
    environment: "https://api.elevenlabs.io",
    apiKey,
  });

  const voiceId = "21m00Tcm4TlvDq8ikWAM";

  const data = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text,
  });

  if (!data.alignment || !data.alignment.characterEndTimesSeconds.length) {
    throw new Error("ElevenLabs response missing timestamps");
  }

  saveBase64ToMp3(data.audioBase64, path);
  return data.alignment;
};

export const generateOpenAiVoice = async (
  text: string,
  apiKey: string,
  outputPath: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "onyx"
): Promise<void> => {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI TTS API error: ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(outputPath, buffer);
};
