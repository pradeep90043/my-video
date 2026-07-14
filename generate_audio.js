const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

// CLI arguments
const voice = process.argv[2] || 'onyx';
const textFile = process.argv[3] || 'aaina_story.txt';

// Check if file exists
if (!fs.existsSync(textFile)) {
    console.error(`\x1b[31mError: Input story file "${textFile}" not found.\x1b[0m`);
    console.log('\nUsage:');
    console.log('  node generate_audio.js [voice] [story_file] [prompt_or_prompt_file]');
    console.log('\nExamples:');
    console.log('  node generate_audio.js onyx aaina_story.txt');
    console.log('  node generate_audio.js ash dadaji_story.txt "Tone: Warm, nostalgic, emotional narration."');
    process.exit(1);
}

const storyText = fs.readFileSync(textFile, 'utf8');

// Determine prompt/instructions
let voicePrompt = '';
const cliPrompt = process.argv[4];

if (cliPrompt) {
    if (fs.existsSync(cliPrompt)) {
        // If 3rd argument is a path to a file, read it
        voicePrompt = fs.readFileSync(cliPrompt, 'utf8').trim();
        console.log(`Using custom prompt from file: ${cliPrompt}`);
    } else {
        // Otherwise, use it as a direct prompt string
        voicePrompt = cliPrompt.trim();
        console.log('Using custom prompt from command line argument.');
    }
} else {
    // Check if matching .prompt.txt exists (e.g. story_name.prompt.txt next to story_name.txt)
    const parsedPath = path.parse(textFile);
    const potentialPromptFile = path.join(parsedPath.dir, `${parsedPath.name}.prompt.txt`);
    
    if (fs.existsSync(potentialPromptFile)) {
        voicePrompt = fs.readFileSync(potentialPromptFile, 'utf8').trim();
        console.log(`Using matching prompt file: ${potentialPromptFile}`);
    } else {
        // Auto-detect based on text content (horror/suspense keywords vs general storytelling)
        const lowercaseText = storyText.toLowerCase();
        const horrorKeywords = ['aaina', 'dar', 'darr', 'bhoot', 'chudail', 'horror', 'suspense', 'khamoshi', 'khoon', 'murder', 'killer', 'accident', 'dead'];
        const isHorror = horrorKeywords.some(keyword => lowercaseText.includes(keyword));
        
        if (isHorror) {
            voicePrompt = `Voice Affect: Low, hushed, and suspenseful; convey tension and intrigue.
Narration Tips: Speak slowly and deliberately. Draw out pauses at suspenseful moments to build tension.
Tone: Deeply serious and mysterious, maintaining an undercurrent of unease.
Pacing: Slow, deliberate, pausing slightly after key moments.
Emotion: Restrained yet intense.
Emphasis: Highlight sensory descriptions to amplify atmosphere.`;
            console.log('No prompt specified. Auto-detected suspense/horror theme and applied suspenseful voice prompt.');
        } else {
            voicePrompt = `Tone: Warm, engaging, and expressive storytelling tone.
Pacing: Natural storytelling pacing with normal pauses between sentences.
Emotion: Expressive and emotionally resonant, matching the context of the story.`;
            console.log('No prompt specified. Applied default expressive storytelling voice prompt.');
        }
    }
}

async function generateVoice() {
    // Launch browser and ensure we close it in case of errors
    const browser = await puppeteer.launch({ headless: true });
    
    try {
        const page = await browser.newPage();
        
        console.log("Navigating to site to clear Vercel Security Checkpoint...");
        await page.goto('https://www.openai.fm/', { waitUntil: 'networkidle2' });
        
        // Wait for Vercel WAF challenge / security checkpoint to complete
        await new Promise(r => setTimeout(r, 4000));
        
        console.log(`Generating audio for voice: ${voice}...`);
        
        const base64Audio = await page.evaluate(async (selectedVoice, inputText, selectedPrompt) => {
            const formData = new FormData();
            formData.append("input", inputText);
            formData.append("prompt", selectedPrompt);
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
        }, voice, storyText, voicePrompt);
        
        const base64Data = base64Audio.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const parsed = path.parse(textFile);
        const filename = path.join(parsed.dir, `${parsed.name}_${voice}.mp3`);
        
        fs.writeFileSync(filename, buffer);
        console.log(`\x1b[32m✅ Saved audio as ${filename}\x1b[0m`);
    } catch (error) {
        console.error('\x1b[31mError during voice generation:\x1b[0m', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

generateVoice();
