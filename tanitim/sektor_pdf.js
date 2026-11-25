// Kullanım: node sektor_pdf.js [önizleme_klasörü]  ->  sektor/HijyenLab_<Sektor>.pdf
const { chromium } = require('playwright');
const path = require('path');
const ADLAR = { restoran: 'Restoran_Kebapci', otel: 'Otel', kuafor: 'Kuafor_Guzellik_Merkezi', toptanci: 'Toptanci_Ajans' };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [ad, dosya] of Object.entries(ADLAR)) {
    await p.goto('file://' + path.resolve(__dirname, 'sektor', ad + '.html'), { waitUntil: 'networkidle' });
    await p.pdf({ path: path.resolve(__dirname, 'sektor', `HijyenLab_${dosya}.pdf`), format: 'A4', printBackground: true,
                  margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    if (process.argv[2]) { await p.setViewportSize({ width: 794, height: 1123 }); await p.screenshot({ path: `${process.argv[2]}/${ad}.png` }); }
  }
  await b.close();
})();
