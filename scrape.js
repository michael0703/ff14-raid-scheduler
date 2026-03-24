import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://ff14.huijiwiki.com/wiki/%E9%83%A8%E9%98%9F%E6%BD%9C%E6%B0%B4%E8%89%87');
  const content = await page.content();
  fs.writeFileSync('wiki_page.html', content);
  await browser.close();
})();
