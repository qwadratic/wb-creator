const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const workbookPath = process.argv[2];
  if (!workbookPath) {
    console.error('Usage: node audit_overflow.js <path_to_workbook.html>');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 DPI
  await page.goto('file://' + path.resolve(workbookPath), {
    waitUntil: 'networkidle0', timeout: 60000
  });

  const measurements = await page.evaluate(() => {
    const pages = document.querySelectorAll('.page, .cover, .block-title-page');
    return Array.from(pages).map((p, i) => {
      const overflow = p.scrollHeight - p.clientHeight;
      return {
        index: i + 1,
        scrollHeight: p.scrollHeight,
        clientHeight: p.clientHeight,
        overflow: overflow,
        status: overflow > 5 ? 'OVERFLOW' : 'OK'
      };
    });
  });

  console.log('--- Overflow Audit Results ---');
  measurements.forEach(m => {
    if (m.status === 'OVERFLOW') {
      console.log(`Page ${m.index}: ${m.status} (scroll=${m.scrollHeight}px, client=${m.clientHeight}px, overflow=${m.overflow}px)`);
    } else {
      console.log(`Page ${m.index}: ${m.status}`);
    }
  });
  console.log('----------------------------');

  const hasOverflow = measurements.some(m => m.status === 'OVERFLOW');
  if (hasOverflow) {
    console.error('\nFound pages with overflow. Please fix them before exporting to PDF.');
    process.exit(1);
  } else {
    console.log('\nAll pages OK — no overflow detected.');
  }

  await browser.close();
})();
