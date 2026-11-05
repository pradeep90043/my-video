/**
 * TopicState manager — tracks the 2-day publish cycle per channel.
 *
 * Each channel has its own state file at:
 *   generated/metadata/{channelId}-topic-state.json
 *
 * Day 1 → long-form video published → state saved with longVideoId + longVideoUrl
 * Day 2 → short published with link → state updated, ready for next topic
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "./config";
import type { TopicState, PublishMode } from "./types";
import { fetchYouTubeVideoStats, type YouTubeCredentials } from "./youtube";

function stateFilePath(channelId: string): string {
  return path.join(PATHS.metadata, `${channelId}-topic-state.json`);
}

/** Load topic state for a channel. Returns null if no state exists yet. */
export function loadTopicState(channelId: string): TopicState | null {
  const p = stateFilePath(channelId);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as TopicState;
  } catch {
    return null;
  }
}

/** Save topic state for a channel. Creates parent dirs if needed. */
export function saveTopicState(channelId: string, state: TopicState): void {
  const p = stateFilePath(channelId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(state, null, 2));
}

/**
 * Determine the publish mode for today's run.
 *
 * Rules:
 * - If no state exists → Day 1 (new topic)
 * - If state.publishMode === "day1-long" and nextPublishAfter has passed → Day 2 (short)
 * - If state.publishMode === "day2-short" → Day 1 (new topic, cycle resets)
 * - If nextPublishAfter hasn't passed yet → throw, too early to publish
 */
export function resolvePublishMode(channelId: string, force?: PublishMode): PublishMode {
  if (force) return force;

  const state = loadTopicState(channelId);
  if (!state) return "day1-long";

  const now = new Date();
  const nextAllowed = new Date(state.nextPublishAfter);

  if (now < nextAllowed) {
    const diffMins = Math.round((nextAllowed.getTime() - now.getTime()) / 60000);
    throw new Error(
      `⏳ Too early to publish for channel "${channelId}". ` +
      `Algorithm window not complete. Try again in ${diffMins} minutes ` +
      `(after ${state.nextPublishAfter}).`
    );
  }

  // If last publish was Day 1 → now do Day 2
  if (state.publishMode === "day1-long") return "day2-short";

  // If last publish was Day 2 → new topic cycle (Day 1)
  return "day1-long";
}

/** Create a fresh Day 1 state after long-form video is published. */
export function createDay1State(opts: {
  channelId: string;
  topic: string;
  category: string;
  slug: string;
  longVideoId: string;
  longVideoUrl: string;
}): TopicState {
  const now = new Date();
  // 24 hours from now — algorithm needs full testing window
  const nextPublishAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const state: TopicState = {
    currentTopic: opts.topic,
    currentCategory: opts.category,
    channel: opts.channelId,
    publishMode: "day1-long",
    longVideoId: opts.longVideoId,
    longVideoUrl: opts.longVideoUrl,
    publishedAt: now.toISOString(),
    nextPublishAfter: nextPublishAfter.toISOString(),
    slug: opts.slug,
    analyticsSnapshot: {
      views24h: 0,
      avgViewDuration: 0,
      stayToWatchRate: 0,
    },
  };

  saveTopicState(opts.channelId, state);
  return state;
}

/** Update state after Day 2 short is published. Marks cycle complete. */
export function updateDay2State(channelId: string, shortVideoId: string): TopicState {
  const state = loadTopicState(channelId);
  if (!state) throw new Error(`No topic state found for channel "${channelId}". Run Day 1 first.`);

  const now = new Date();
  const nextPublishAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const updated: TopicState = {
    ...state,
    publishMode: "day2-short",
    publishedAt: now.toISOString(),
    nextPublishAfter: nextPublishAfter.toISOString(),
  };

  saveTopicState(channelId, updated);
  return updated;
}

/** Update analytics snapshot (call after fetching YouTube Studio data). */
export function updateAnalytics(
  channelId: string,
  analytics: { views24h: number; avgViewDuration: number; stayToWatchRate: number }
): void {
  const state = loadTopicState(channelId);
  if (!state) return;
  saveTopicState(channelId, { ...state, analyticsSnapshot: analytics });
}

/**
 * Closed-Loop YouTube Analytics Sync:
 * Fetches real view stats for the previous video and saves them to state.
 */
export async function syncYouTubeAnalytics(
  channelId: string,
  credentials?: YouTubeCredentials
): Promise<{ views: number; likes: number; comments: number } | null> {
  const state = loadTopicState(channelId);
  if (!state || !state.longVideoId) return null;

  const stats = await fetchYouTubeVideoStats(state.longVideoId, credentials);
  if (stats) {
    updateAnalytics(channelId, {
      views24h: stats.views,
      avgViewDuration: state.analyticsSnapshot?.avgViewDuration ?? 0,
      stayToWatchRate: state.analyticsSnapshot?.stayToWatchRate ?? 0,
    });
  }
  return stats;
}

/**
 * Adaptive Hook Weights based on past retention analytics:
 * If the last video had low Stay-to-Watch (<75%), dynamically elevate
 * firstWordPunch and emotionalTrigger weights to force more aggressive scroll-stopping hooks.
 */
export function getAdaptiveHookWeights(channelId: string): {
  firstWordPunch: number;
  emotionalTrigger: number;
  curiosityGap: number;
  hinglishNaturalness: number;
} {
  const state = loadTopicState(channelId);
  const stay = state?.analyticsSnapshot?.stayToWatchRate ?? 0;
  const avd = state?.analyticsSnapshot?.avgViewDuration ?? 0;

  // If stay-to-watch was under target (<75%), prioritize instant scroll-stop
  if (stay > 0 && stay < 75) {
    return {
      firstWordPunch: 0.40,
      emotionalTrigger: 0.35,
      curiosityGap: 0.15,
      hinglishNaturalness: 0.10,
    };
  }

  // If average view duration was low (<80%), prioritize emotional curiosity loops
  if (avd > 0 && avd < 80) {
    return {
      firstWordPunch: 0.25,
      emotionalTrigger: 0.35,
      curiosityGap: 0.30,
      hinglishNaturalness: 0.10,
    };
  }

  // Default balanced weights
  return {
    firstWordPunch: 0.30,
    emotionalTrigger: 0.30,
    curiosityGap: 0.25,
    hinglishNaturalness: 0.15,
  };
}
