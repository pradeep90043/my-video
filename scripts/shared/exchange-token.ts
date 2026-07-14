import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/oauth2callback";
  
  // The code returned by Google in the redirect URL
  const code = "4/0AdkVLPyScUyixiR-7yTvIUsAB-MhQYqL-4mFphuNM7-U9bXcx3MNf5gN5oZ3WUMu9qkCLA";

  if (!clientId || !clientSecret) {
    console.error("Missing credentials");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  console.log("Exchanging code for tokens...");
  const { tokens } = await oauth2Client.getToken(code);
  console.log("\n=================================");
  console.log("SUCCESS!");
  console.log("REFRESH_TOKEN:", tokens.refresh_token);
  console.log("=================================\n");
}

main().catch(console.error);
