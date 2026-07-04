import { z } from "zod";

export const CodeOrCapConfigSchema = z.object({
  claim: z.string(),
  verdict: z.string(),
  rating: z.string(),
  winner: z.string(),
  hook: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  handle: z.string().optional(),
  voiceoverTrack: z.string().optional(),
  musicTrack: z.string().optional(),
  glitchSfx: z.string().optional(),
  impactSfx: z.string().optional(),
});

export type CodeOrCapConfig = z.infer<typeof CodeOrCapConfigSchema>;

export const defaultCodeOrCapConfig: CodeOrCapConfig = {
  claim: "MERN Stack Is Outdated",
  verdict: "PARTIALLY TRUE",
  rating: "5/10",
  winner: "MERN + TypeScript + Next.js + PostgreSQL",
  hook: "Sab bol rahe hain MERN Stack outdated ho gaya. But agar aisa hai… toh fir kyun 2024 mein bhi lakhs of Indian startups sirf MERN engineers hi hire kar rahe hain?",
  evidence: [
    "React (the R in MERN) gets 25M+ npm downloads every week — still the most used frontend library on the planet.",
    "Naukri and LinkedIn show 40,000+ active MERN job listings in India in 2024 — the job market hasn't moved on.",
    "The real weak link is MongoDB — for complex relational data it struggles vs TypeScript-first stacks like T3 or Next.js + Prisma.",
  ],
  handle: "@codeorcap",
  voiceoverTrack: "content/codeorcap/audio/voiceover.mp3",
};
