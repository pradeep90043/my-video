const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

const voice = process.argv[2] || 'onyx';

const textFile = process.argv[3] || 'aaina_story.txt';
const storyText = fs.readFileSync(textFile, 'utf8');

async function generateVoice() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log("Navigating to site to clear Vercel Security Checkpoint...");
    await page.goto('https://www.openai.fm/', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 4000)); // wait for WAF challenge to complete
    
    console.log(`Generating audio for voice: ${voice}...`);
    
    const base64Audio = await page.evaluate(async (selectedVoice, inputText) => {
        const formData = new FormData();
        formData.append("input", inputText);
        
        formData.append("prompt", `Voice Affect: Low, hushed, and suspenseful; convey tension and intrigue.\n\nNarration Tips: 'Aaine mein' wale parts mein awaaz aur dheemi karein. Last 3 lines bahut slow bolein — ek-ek shabd. Pause ko 3-4 second tak kheenchein — darr wahan hi hai! \n\nTone: Deeply serious and mysterious, maintaining an undercurrent of unease throughout.\n\nPacing: Slow, deliberate, pausing slightly after suspenseful moments to heighten drama.\n\nEmotion: Restrained yet intense—voice should subtly tremble or tighten at key suspenseful points.\n\nEmphasis: Highlight sensory descriptions to amplify atmosphere.\n\nPronunciation: Slightly elongated vowels and softened consonants for an eerie, haunting effect.`);
        
        formData.append("voice", selectedVoice);
        formData.append("vibe", "");
        
        const response = await fetch('https://www.openai.fm/api/generate', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('HTTP error ' + response.status);
        }
        
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }, voice, storyText);
    
    const base64Data = base64Audio.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${textFile.split('.')[0]}_${voice}.mp3`;
    fs.writeFileSync(filename, buffer);
    
    console.log(`✅ Saved audio as ${filename}`);
    await browser.close();
}

generateVoice().catch(console.error);
