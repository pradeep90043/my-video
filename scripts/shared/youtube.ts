import { google } from "googleapis";
import * as fs from "fs";

interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

export interface YouTubeCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function uploadVideoToYouTube(
  filePath: string,
  title: string,
  description: string,
  privacyStatus: "public" | "private" | "unlisted" = "public",
  credentials?: YouTubeCredentials
): Promise<YouTubeUploadResult> {
  const clientId = credentials?.clientId ?? process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = credentials?.clientSecret ?? process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = credentials?.refreshToken ?? process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      success: false,
      error: "Missing YouTube OAuth2 credentials. Check YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and the channel-specific refresh token in .env.",
    };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `Video file not found: ${filePath}` };
  }

  try {
    console.log(`[YouTube API] Authenticating client...`);
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    console.log(`[YouTube API] Initializing upload for: ${filePath}`);
    const fileSize = fs.statSync(filePath).size;

    const response = await youtube.videos.insert(
      {
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title,
            description,
            categoryId: "22",
          },
          status: { privacyStatus },
        },
        media: { body: fs.createReadStream(filePath) },
      },
      {
        onUploadProgress: (evt) => {
          const progress = ((evt.bytesRead / fileSize) * 100).toFixed(1);
          console.log(`[YouTube API] Upload progress: ${progress}% (${evt.bytesRead}/${fileSize} bytes)`);
        },
      }
    );

    const videoId = response.data.id;
    if (!videoId) {
      return { success: false, error: "Upload completed but no video ID returned." };
    }

    console.log(`[YouTube API] Video uploaded successfully! Video ID: ${videoId}`);
    console.log(`[YouTube API] Watch link: https://www.youtube.com/watch?v=${videoId}`);
    return { success: true, videoId };
  } catch (err: any) {
    console.error("[YouTube API] Upload failed:", err.message);
    return { success: false, error: err.message };
  }
}
