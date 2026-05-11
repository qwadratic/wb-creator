
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const workbookPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!workbookPath || !outputPath) {
    console.error('Usage: node export_pdf.js <path_to_workbook.html> <output_path.pdf>');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(workbookPath), {
    waitUntil: 'networkidle0',
    timeout: 60000
  });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await browser.close();

  console.log(`✅ Workbook successfully exported to: ${outputPath}`);
})();
