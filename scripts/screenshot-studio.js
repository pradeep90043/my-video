const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click on VibeCodingNotProgramming in the compositions list
  const links = await page.$$('a, button, li, [role="button"], [class*="item"]');
  for (const link of links) {
    const text = await link.evaluate(function(el) { return el.textContent ? el.textContent.trim() : ''; });
    if (text && text.includes('VibeCoding')) {
      console.log('Clicking:', text);
      await link.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: 'studio-vibe2.png' });
  await browser.close();
  console.log('Done');
})().catch(function(e) { console.error(e.message); process.exit(1); });
