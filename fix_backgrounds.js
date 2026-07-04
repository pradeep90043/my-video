const fs = require("fs");
const path = require("path");

const scenesDir = path.join(__dirname, "src/codeorcap/scenes");
const files = fs.readdirSync(scenesDir).filter(f => f.endsWith(".tsx"));

for (const file of files) {
  const filePath = path.join(scenesDir, file);
  let content = fs.readFileSync(filePath, "utf-8");
  
  // We only want to remove the opaque background from the root container of each scene.
  // A safe heuristic is replacing `backgroundColor: brand.black,` and `background: brand.black,`
  // with `backgroundColor: "transparent",` if it's the root of the scene (width: 1920, height: 1080).
  
  // Or we can just globally replace it since brand.black is usually only used as a full background, 
  // except maybe in text shadows or borders. But as a background property, it's safe to make transparent if we want the global background to show through.
  
  // Let's target the known patterns:
  content = content.replace(/backgroundColor:\s*brand\.black,/g, 'backgroundColor: "transparent",');
  content = content.replace(/background:\s*brand\.black,/g, 'background: "transparent",');
  
  // Also HeadToHeadScene line 269: background: `rgba(11,11,11,0.92)`,
  // Let's leave that since it's a specific box.
  
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`Updated ${file}`);
}
