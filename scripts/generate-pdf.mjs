import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function generatePDF() {
  console.log('Launching headless Chromium...');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  const htmlPath = path.join(rootDir, 'public', 'slides.html');
  console.log(`Loading slides from: file://${htmlPath}`);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  // Emulate print media so page-by-page @media print takes effect
  await page.emulateMedia({ media: 'print' });

  const pdfPathPublic = path.join(rootDir, 'public', 'Vocalis_Pitch_Deck.pdf');
  const pdfPathRoot = path.join(rootDir, 'Vocalis_Pitch_Deck.pdf');

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPathPublic,
    width: '16in',
    height: '9in',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  // Also write to root directory
  await page.pdf({
    path: pdfPathRoot,
    width: '16in',
    height: '9in',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  console.log(`✅ PDF generated successfully:`);
  console.log(` - ${pdfPathPublic}`);
  console.log(` - ${pdfPathRoot}`);
}

generatePDF().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
