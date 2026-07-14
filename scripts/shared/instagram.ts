/**
 * Instagram Graph API Integrations for Auto-Posting Reels & Auto-Replying to DMs/Comments.
 */
import axios from "axios";

const API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface InstagramPublishResult {
  success: boolean;
  mediaId?: string;
  error?: string;
}

/**
 * Polls the media container status until it is FINISHED or errors out.
 */
async function pollContainerStatus(containerId: string, accessToken: string): Promise<boolean> {
  const url = `${BASE_URL}/${containerId}`;
  
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await axios.get(url, {
        params: {
          fields: "status_code",
          access_token: accessToken
        }
      });
      
      const status = response.data.status_code;
      console.log(`[Instagram API] Container ${containerId} status: ${status}`);
      
      if (status === "FINISHED") {
        return true;
      } else if (status === "ERROR") {
        return false;
      }
    } catch (err: any) {
      console.error("[Instagram API] Error polling container status:", err.response?.data ?? err.message);
    }
    
    // Wait 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  
  return false;
}

/**
 * Publishes a Reel/Video to an Instagram Business Account.
 * Note: The videoUrl must be a publicly accessible direct link to the MP4 file.
 */
export async function publishReel(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  try {
    console.log(`[Instagram API] Initializing Reel upload container...`);
    
    // 1. Create the container
    const containerRes = await axios.post(`${BASE_URL}/${igUserId}/media`, null, {
      params: {
        media_type: "REELS",
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken
      }
    });
    
    const containerId = containerRes.data.id;
    console.log(`[Instagram API] Container created: ${containerId}. Waiting for processing...`);
    
    // 2. Poll until the container status is FINISHED
    const isFinished = await pollContainerStatus(containerId, accessToken);
    if (!isFinished) {
      return {
        success: false,
        error: "Video processing timed out or failed on Meta servers."
      };
    }
    
    // 3. Publish the container
    console.log(`[Instagram API] Publishing Reel container ${containerId}...`);
    const publishRes = await axios.post(`${BASE_URL}/${igUserId}/media_publish`, null, {
      params: {
        creation_id: containerId,
        access_token: accessToken
      }
    });
    
    const mediaId = publishRes.data.id;
    console.log(`[Instagram API] Reel published successfully! Media ID: ${mediaId}`);
    return {
      success: true,
      mediaId
    };
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message ?? err.message;
    console.error("[Instagram API] Error publishing Reel:", errMsg);
    return {
      success: false,
      error: errMsg
    };
  }
}

/**
 * Sends a DM reply to a user's Instagram-scoped User ID (IGSID).
 */
export async function sendDM(
  recipientId: string,
  accessToken: string,
  text: string
): Promise<boolean> {
  const url = `${BASE_URL}/me/messages`;
  try {
    const response = await axios.post(
      url,
      {
        recipient: { id: recipientId },
        message: { text }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`[Instagram API] DM sent successfully to ${recipientId}:`, response.data);
    return true;
  } catch (err: any) {
    console.error("[Instagram API] Error sending DM:", err.response?.data?.error?.message ?? err.message);
    return false;
  }
}

/**
 * Sends a public reply to a comment ID.
 */
export async function replyToComment(
  commentId: string,
  accessToken: string,
  text: string
): Promise<boolean> {
  const url = `${BASE_URL}/${commentId}/replies`;
  try {
    const response = await axios.post(url, null, {
      params: {
        message: text,
        access_token: accessToken
      }
    });
    console.log(`[Instagram API] Comment reply sent successfully to ${commentId}:`, response.data);
    return true;
  } catch (err: any) {
    console.error("[Instagram API] Error replying to comment:", err.response?.data?.error?.message ?? err.message);
    return false;
  }
}
