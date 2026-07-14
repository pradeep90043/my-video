const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click VibeCodingNotProgramming
  const links = await page.$$('a, button, li, [role="button"], [class*="item"]');
  for (const link of links) {
    const text = await link.evaluate(function(el) { return el.textContent ? el.textContent.trim() : ''; });
    if (text && text.includes('VibeCoding')) {
      await link.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'studio-frame0.png' });

  // Try to navigate to a frame ~100 using the frame input
  await page.keyboard.press('Space'); // pause first if playing
  await new Promise(r => setTimeout(r, 500));

  // Click on the timeline at around the middle and take a screenshot
  const timeline = await page.$('[class*="timeline"], [class*="Timeline"]');
  if (timeline) {
    const box = await timeline.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2);
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'studio-frame-mid.png' });

  await browser.close();
  console.log('Done');
})().catch(function(e) { console.error(e.message); process.exit(1); });
