const { chromium } = require('C:/Users/sajan/AppData/Local/OpenAI/Codex/runtimes/cua_node/3dd31cfff853001c/bin/node_modules/playwright');

async function inspectCanva() {
  console.log('Launching Chrome to inspect Canva...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 }
  });

  const page = await context.newPage();

  try {
    const urls = [
      'https://www.canva.com/design/DAHXoIj1K40/VBWee2Xuto3eQKajNEDLog/view',
      'https://www.canva.com/design/DAHXoIj1K40/VBWee2Xuto3eQKajNEDLog/edit'
    ];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`Navigating to ${url}...`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(6000);
        
        const title = await page.title();
        console.log(`Page title: ${title}`);

        const textContent = await page.evaluate(() => document.body.innerText);
        console.log(`Text snippet (${url}):\n${textContent.slice(0, 1000)}`);

        const screenshotPath = `canva-shot-${i + 1}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Screenshot saved to ${screenshotPath}`);

        if (textContent.length > 50) {
          console.log(`FOUND CONTENT on URL ${i + 1}!`);
          break;
        }
      } catch (err) {
        console.log(`Failed for ${url}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

inspectCanva().catch(e => console.error(e));
