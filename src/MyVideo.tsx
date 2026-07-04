import React from "react";
import { AbsoluteFill, Sequence, staticFile, Img } from "remotion";
import { Audio } from "@remotion/media";
import videoData from "../public/content/AivsSWE/video.json";

const sceneImageMap: Record<string, string> = {
  hook: "01-tech.jpeg",
  claim: "02-business.jpeg",
  rules: "03-minimalist.jpeg",
  swe: "02-business.jpeg",
  ai: "01-tech.jpeg",
  headToHead: "04-energetic.jpeg",
  reality: "05-data.jpeg",
  verdict: "06-luxury.jpeg",
  cta: "06-luxury.jpeg",
};

export const MyVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <Audio src={staticFile("content/AivsSWE/audio/voiceover.mp3")} />
      
      {videoData.scenes.map((scene: any) => {
        const bgImage = sceneImageMap[scene.id];

        return (
          <Sequence 
            key={scene.id} 
            from={scene.startFrame} 
            durationInFrames={scene.durationFrames}
          >
            {/* Background Image Layer */}
            {bgImage && (
              <AbsoluteFill style={{ zIndex: 0 }}>
                <Img 
                  src={staticFile(`content/AivsSWE/${bgImage}`)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.4,
                  }}
                />
              </AbsoluteFill>
            )}

            {/* Main Content Layer */}
            <AbsoluteFill style={{ 
              backgroundColor: scene.color || "transparent",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "80px",
              fontFamily: "system-ui, sans-serif",
              zIndex: 1
            }}>
              <h1 style={{ 
                fontSize: 160, 
                color: "white", 
                margin: 0, 
                textShadow: "0 8px 30px rgba(0,0,0,0.3)",
                fontWeight: 900
              }}>
                {scene.title}
              </h1>
              <p style={{ 
                fontSize: 70, 
                color: "rgba(255,255,255,0.9)", 
                textAlign: "center", 
                maxWidth: "80%",
                lineHeight: 1.4,
                marginTop: "40px",
                textShadow: "0 4px 15px rgba(0,0,0,0.5)"
              }}>
                {scene.text}
              </p>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
