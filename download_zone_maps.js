import fs from 'fs';
import path from 'path';

async function downloadFile(url, dest) {
  console.log(`Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buf));
  console.log(`Saved to ${dest}`);
}

async function run() {
  const dir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const baseUrl = 'https://cycleapple.github.io/ffxiv-item-search-tc/data/';
  const files = ['zone-maps.json'];
  
  for (const file of files) {
    try {
      await downloadFile(baseUrl + file, path.join(dir, file));
    } catch (e) {
      console.error(`Error downloading ${file}:`, e);
    }
  }
}

run();
