import { google } from "googleapis";
import express from "express";
import * as dotenv from "dotenv";
import { URL } from "url";

dotenv.config();

const DEFAULT_PORT = 3002;

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || `http://localhost:${DEFAULT_PORT}/oauth2callback`;

  if (!clientId || !clientSecret) {
    console.error("❌ Error: Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env file.");
    console.error("Please add them to your .env file first, then run this script again.");
    process.exit(1);
  }

  // Parse port from the configured YOUTUBE_REDIRECT_URI
  let port = DEFAULT_PORT;
  try {
    const url = new URL(redirectUri);
    if (url.port) {
      port = parseInt(url.port, 10);
    }
  } catch (e) {
    console.warn(`[YouTube Auth] Could not parse port from REDIRECT_URI "${redirectUri}". Defaulting to port ${DEFAULT_PORT}.`);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    prompt: "consent" // Force to get refresh token
  });

  const app = express();
  let server: any;

  // Use the path from the redirect URI
  let pathName = "/oauth2callback";
  try {
    const url = new URL(redirectUri);
    pathName = url.pathname;
  } catch {}

  app.get(pathName, async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      res.send("Authorization failed. Code not found.");
      return;
    }

    try {
      console.log("⚡ Code received. Exchanging for tokens...");
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log("\n==================================================");
      console.log("🎉 SUCCESS! Tokens generated successfully.");
      console.log("==================================================");
      console.log(`\nCopy the Refresh Token below and paste it in your .env:\n`);
      console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("\n==================================================");

      res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #06080D; color: #FFFFFF;">
            <h1 style="color: #FFB800;">OAuth2 Success!</h1>
            <p>Your YouTube refresh token has been printed in the terminal.</p>
            <p>You can close this window now.</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("❌ Error exchanging code for token:", err.message);
      res.send("Error exchanging code for token. Check terminal logs.");
    } finally {
      // Shutdown the server
      setTimeout(() => {
        server.close(() => {
          console.log("💤 Authentication server shut down.");
          process.exit(0);
        });
      }, 1000);
    }
  });

  server = app.listen(port, () => {
    console.log(`\n🔑 YouTube Authentication Flow`);
    console.log(`---------------------------------`);
    console.log(`Using redirect URI: ${redirectUri}`);
    console.log(`Listening on port: ${port}`);
    console.log(`\n1. Open the following URL in your browser:`);
    console.log(`\n   \x1b[36m${authUrl}\x1b[0m\n`);
    console.log(`2. Log in with your YouTube Google Account and grant upload permission.`);
    console.log(`3. The server will capture the redirect and print the Refresh Token here.\n`);
  });
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
