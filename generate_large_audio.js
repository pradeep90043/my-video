const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// CLI arguments
const voice = process.argv[2] || 'onyx';
const textFile = process.argv[3] || 'galat_number_story.txt';
const force = process.argv.includes('--force');

if (!fs.existsSync(textFile)) {
    console.error(`\x1b[31mError: Input story file "${textFile}" not found.\x1b[0m`);
    process.exit(1);
}

const storyText = fs.readFileSync(textFile, 'utf8');

// Determine voice prompt / instructions
const parsedPath = path.parse(textFile);
const potentialPromptFile = path.join(parsedPath.dir, `${parsedPath.name}.prompt.txt`);
let voicePrompt = "";

if (fs.existsSync(potentialPromptFile)) {
    voicePrompt = fs.readFileSync(potentialPromptFile, 'utf8').trim();
    console.log(`🎙 Using matching prompt file: ${potentialPromptFile}`);
} else {
    voicePrompt = `Voice Affect: Low, hushed, and suspenseful; convey tension and intrigue.
Tone: Deeply serious and mysterious, maintaining an undercurrent of unease.
Pacing: Slow, deliberate, pausing slightly after key moments.
Emotion: Restrained yet intense.`;
    console.log('🎙 Using default suspenseful storytelling voice prompt.');
}

// Split story text into chunks of less than 900 characters at paragraph boundaries
function splitTextIntoChunks(text, maxChars = 900) {
    const paragraphs = text.split(/\n+/);
    const chunks = [];
    let currentChunk = "";

    for (let p of paragraphs) {
        p = p.trim();
        if (!p) continue;

        if (currentChunk.length + p.length + 2 > maxChars) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = p;
        } else {
            currentChunk += (currentChunk ? "\n\n" : "") + p;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

const chunks = splitTextIntoChunks(storyText);
console.log(`Split story into ${chunks.length} chunks to bypass the 999-character site limit.`);

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function generateVoice() {
    const tempFiles = [];
    let browser = null;
    
    try {
        // Collect list of temporary file paths
        for (let i = 0; i < chunks.length; i++) {
            tempFiles.push(path.join(parsedPath.dir, `temp_chunk_${i}.mp3`));
        }

        // Check which chunks need to be generated
        const chunksToGenerate = [];
        for (let i = 0; i < chunks.length; i++) {
            const tempFile = tempFiles[i];
            const exists = fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0;
            if (!exists || force) {
                chunksToGenerate.push(i);
            }
        }

        if (chunksToGenerate.length > 0) {
            console.log(`Need to generate ${chunksToGenerate.length} of ${chunks.length} chunks.`);
            browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            console.log("Navigating to site to clear Vercel Security Checkpoint...");
            await page.goto('https://www.openai.fm/', { waitUntil: 'networkidle2' });
            await sleep(4000); // wait for WAF challenge to complete
            
            for (const i of chunksToGenerate) {
                console.log(`Generating chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
                
                let success = false;
                let retries = 4;
                let lastError = null;
                
                while (retries > 0 && !success) {
                    try {
                        // Long delay: 15s to bypass rate limits
                        await sleep(15000);
                        
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
                            
                            if (response.status === 429) {
                                throw new Error('HTTP 429 (Rate Limited)');
                            }
                            
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
                        }, voice, chunks[i], voicePrompt);
                        
                        const base64Data = base64Audio.split(',')[1];
                        const buffer = Buffer.from(base64Data, 'base64');
                        
                        fs.writeFileSync(tempFiles[i], buffer);
                        success = true;
                        console.log(` -> Chunk ${i + 1} generated successfully.`);
                    } catch (error) {
                        lastError = error;
                        retries--;
                        if (retries > 0) {
                            const waitTime = (5 - retries) * 30000; // 30s, 60s, 90s delay on retry
                            console.warn(` ⚠️ Chunk ${i + 1} failed: ${error.message}. Waiting ${waitTime/1000}s to cool down before retry...`);
                            await sleep(waitTime);
                        }
                    }
                }
                
                if (!success) {
                    throw lastError || new Error(`Failed to generate chunk ${i + 1}`);
                }
            }
        } else {
            console.log("All chunks already exist. Skipping API generation.");
        }
        
        // Merge the generated chunks using ffmpeg
        const finalFilename = path.join(parsedPath.dir, `${parsedPath.name}_${voice}.mp3`);
        console.log(`Merging ${tempFiles.length} chunks into ${finalFilename}...`);
        
        const concatString = tempFiles.join('|');
        execSync(`ffmpeg -y -i "concat:${concatString}" -acodec copy "${finalFilename}"`);
        
        console.log(`\x1b[32m✅ Saved complete audio as ${finalFilename}\x1b[0m`);
        
        // Cleanup temp files only on successful merge
        console.log("Cleaning up temporary chunk files...");
        for (const file of tempFiles) {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        }
    } catch (error) {
        console.error('\x1b[31mError during voice generation:\x1b[0m', error);
        console.log('\n\x1b[33mTip: The script has saved progress. You can run it again later to resume missing chunks.\x1b[0m');
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

generateVoice();
