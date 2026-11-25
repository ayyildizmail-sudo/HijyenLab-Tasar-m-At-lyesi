// Kullanım: node referans_pdf.js [önizleme.png]  ->  HijyenLab_Referanslar.pdf
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, 'referanslar.html'), { waitUntil: 'networkidle' });
  await p.pdf({ path: path.resolve(__dirname, 'HijyenLab_Referanslar.pdf'), format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  if (process.argv[2]) { await p.setViewportSize({ width: 794, height: 1123 }); await p.screenshot({ path: process.argv[2] }); }
  await b.close();
})();
