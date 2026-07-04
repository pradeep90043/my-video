import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const VOICE = "hi-IN-MadhurNeural"; // Hindi male for Hinglish
const RATE = "+5%";

const SCRIPT = `Ek AI Engineer, ek Software Engineer. Same college, same batch, same year. Lekin ek ki salary doosre se double? 2026 mein — ye sach hai, ya sirf LinkedIn ka hype? Aaj sirf ek cheez bolegi… numbers. Toh — Code ya Cap?

Claim simple hai: 'AI Engineer bano — Software Engineer se kahin zyada paisa milega.' Har doosri reel, har career influencer yahi bol raha hai — 'SDE toh purana ho gaya, ab AI ka zamana hai.' Sunne mein sexy lagta hai. Lekin CodeOrCap pe hum assume nahi karte — hum verify karte hain. Chalo data nikaalte hain.

Rules clear kar dete hain. Saare numbers 2026 ke hain, India ke — Glassdoor, Levels dot fyi, NASSCOM aur Scaler jaise sources se. Aur hum ek average number nahi dikhaenge — kyunki average jhooth bolta hai. Fresher, mid-level, aur senior — teenon alag dekhenge. Ready? Let's go.

Pehle Software Engineer. India ka SDE market bimodal hai — do alag duniya. Service companies — TCS, Infosys, Wipro — fresher ko dete hain saade teen se saat lakh. Wahi product companies aur GCCs, same fresher ko dete hain aath se bais lakh. Aur top FAANG campus offers? Pachchees se paintaalees lakh — par ye ek percent se bhi kam logon ko milta hai. Median nikaalo toh aath se baarah lakh baithta hai. Paanch saal baad, product company mein bais se atthais lakh; aur FAANG senior level pe total compensation ek crore se dhai crore tak — mostly stock ki wajah se. Yaad rakho — yahan sabse bada factor role nahi, company type hai.

Ab AI Engineer. Glassdoor ke hisaab se average around gyaarah lakh. Par yahan bhi average bekaar hai. Generalist AI fresher ko service company mein milta hai paanch se aath lakh — matlab SDE se koi khaas farak nahi! Twist yahan hai: agar tumhare paas GenAI, LLM ya MLOps skills hain, toh fresher package jump karke aath se baarah lakh, aur top product ya GCC mein pandrah se bais lakh. Mid-level, chaar se chhe saal: das se pachchees lakh. Senior GenAI ya MLOps specialist: pachchees se pachaas lakh plus. Aur Google ka principal AI researcher? Assi lakh ke upar. Scaler ka data kehta hai — GenAI aur MLOps skills, same experience pe, bees se chaalees percent zyada offer dilaati hain.

Toh seedha muqabla. Fresher level pe — generalist AI aur SDE lagbhag barabar. 'AI double deta hai' — ye yahan pe mostly cap hai. Premium tab aata hai jab tum specialize karte ho — GenAI, LLM, MLOps. Aur sabse important — dono careers mein sabse bada lever role ka naam nahi, company type hai. Ek product company ka SDE, ek service company ke generalist AI engineer se easily zyada kama raha hai. Title se zyada… jagah maayne rakhti hai.

Ab asli sach — jo koi influencer nahi batata. 2026 mein 'AI Engineer' aur 'Software Engineer' alag-alag box nahi rahe. Zyada-tar AI engineers actually software engineers hi hain, jinhone ML aur GenAI skills add ki. Wo bees-chaalees percent premium — wo AI ke naam ka nahi, us extra skill ka hai. Matlab: tumhe SDE fundamentals — DSA, system design, clean code — chhodne nahi hain, balki unke upar AI build karna hai. Jo log DSA ko 'dead' bolke sirf prompt likhna seekh rahe hain — wo dono naukriyon ke liye kamzor ban rahe hain. AI ek layer hai — replacement nahi.

Toh verdict. Claim tha — 'AI Engineer ki salary Software Engineer se bahut zyada hoti hai.' Blanket form mein? Partially true — jhukta hua cap ki taraf. Premium real hai, par sirf specialized AI ke liye, aur company type usse bhi bada factor hai. Truth rating: dus mein se chaar.

Toh title ke peeche mat bhaago — skills aur company ke peeche bhaago. Ye helpful laga toh subscribe karo — kyunki hum guessing nahi, knowing pe kaam karte hain. Milte hain agle fact-check mein. CodeOrCap.`;

const outDir = path.join(process.cwd(), "public", "content", "codeorcap", "audio");
fs.mkdirSync(outDir, { recursive: true });

const outputPath = path.join(outDir, "voiceover-5min.mp3");

try {
  console.log(`🎙  Generating Hinglish voiceover with "${VOICE}" (rate: ${RATE})...`);

  const escaped = SCRIPT.replace(/'/g, "'\\''");

  execSync(
    `edge-tts --voice "${VOICE}" --rate "${RATE}" --pitch "+0Hz" --text '${escaped}' --write-media "${outputPath}"`,
    { stdio: "pipe", timeout: 120_000 }
  );

  const probe = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
  const durationSecs = parseFloat(probe);

  console.log(`✅ Voiceover saved: ${outputPath}`);
  console.log(`⏱  Duration: ${durationSecs} seconds`);
} catch (e: any) {
  console.error("Failed:", e.message);
}
