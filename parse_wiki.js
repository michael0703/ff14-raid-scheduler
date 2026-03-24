import fs from 'fs';

try {
  const html = fs.readFileSync('wiki_page.html', 'utf8');
  const startIdx = html.indexOf('id="列表"');
  if (startIdx === -1) {
    console.log('ID "列表" not found in HTML');
  } else {
    // Print a larger chunk to see the table structure
    console.log(html.substring(startIdx, startIdx + 10000));
  }
} catch (e) {
  console.error(e);
}
