// Kullanım: node pdf_olustur.js  ->  HijyenLab_Katalog.pdf ve onizleme PNG'leri
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, 'katalog.html'), { waitUntil: 'networkidle' });
  await p.pdf({ path: path.resolve(__dirname, 'HijyenLab_Katalog.pdf'), format: 'A4', printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  if (process.argv[2]) {
    await p.setViewportSize({ width: 794, height: 1123 });
    const n = await p.locator('.sayfa').count();
    for (let i = 0; i < n; i++) await p.locator('.sayfa').nth(i).screenshot({ path: `${process.argv[2]}/s${i + 1}.png` });
  }
  await b.close();
})();
