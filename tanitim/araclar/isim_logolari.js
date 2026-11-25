// Orijinal logo dosyası gelmeyen müşteriler için isim yazısı (tipografik) logolar.
// Logoları taklit etmez: markanın adı, uygun bir yazı karakteri ve rengiyle yazılır.
// Gerçek logo dosyası gelince varliklar/kurumsal_logolar/<ad>.png onunla değiştirilir.
// Kullanım: node araclar/isim_logolari.js <fontsource_klasörü>   (npm pack @fontsource/{cinzel,cormorant-garamond,playfair-display,great-vibes})
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const F = process.argv[2];
const yuz = (aile, klasor, dosya, w) => ['latin', 'latin-ext'].map(a => {
  const p = path.join(F, klasor, 'package/files', `${dosya}-${a}-${w}-normal.woff2`);
  return `@font-face{font-family:'${aile}';font-weight:${w};src:url('file://${p}') format('woff2');${a === 'latin-ext' ? 'unicode-range:U+0100-024F,U+1E00-1EFF;' : ''}}`;
}).join('');
const FONT = yuz('Cinzel', 'fontsource-cinzel-5.3.0', 'cinzel', 400) + yuz('Cinzel', 'fontsource-cinzel-5.3.0', 'cinzel', 600)
  + yuz('Cormorant', 'fontsource-cormorant-garamond-5.3.0', 'cormorant-garamond', 500) + yuz('Cormorant', 'fontsource-cormorant-garamond-5.3.0', 'cormorant-garamond', 600)
  + yuz('Playfair', 'fontsource-playfair-display-5.3.0', 'playfair-display', 500) + yuz('Playfair', 'fontsource-playfair-display-5.3.0', 'playfair-display', 700)
  + yuz('Vibes', 'fontsource-great-vibes-5.3.0', 'great-vibes', 400);
const L = {
  ciragan: `<div style="text-align:center;color:#9C7A3C"><div style="font:600 150px Cinzel;letter-spacing:.06em">ÇIRAĞAN PALACE</div><div style="height:6px;width:520px;margin:26px auto 22px;background:#9C7A3C"></div><div style="font:400 64px Cinzel;letter-spacing:.42em;padding-left:.42em">KEMPINSKI</div><div style="font:500 52px Cormorant;letter-spacing:.3em;margin-top:6px;padding-left:.3em">ISTANBUL</div></div>`,
  rixos: `<div style="text-align:center;color:#1E1E1E"><div style="font:400 220px Cinzel;letter-spacing:.28em;padding-left:.28em">RIXOS</div><div style="font:500 60px Cormorant;letter-spacing:.5em;padding-left:.5em;margin-top:-10px;color:#9C7A3C">HOTELS</div></div>`,
  fourseasons: `<div style="text-align:center;color:#1E1E1E"><div style="font:600 170px Cormorant;letter-spacing:.14em;padding-left:.14em">FOUR SEASONS</div><div style="font:500 56px Cormorant;letter-spacing:.42em;padding-left:.42em;margin-top:-6px">HOTELS AND RESORTS</div></div>`,
  divan: `<div style="text-align:center;color:#1F2D52"><div style="font:700 210px Playfair;letter-spacing:.12em;padding-left:.12em">DİVAN</div><div style="height:5px;width:440px;margin:6px auto 20px;background:#B08D4C"></div><div style="font:500 58px Cormorant;letter-spacing:.45em;padding-left:.45em">HOTELS</div></div>`,
  merit: `<div style="text-align:center;color:#6E1A2E"><div style="font:600 200px Cinzel;letter-spacing:.2em;padding-left:.2em">MERIT</div><div style="font:500 58px Cormorant;letter-spacing:.45em;padding-left:.45em;margin-top:-4px;color:#1E1E1E">HOTELS &amp; RESORTS</div></div>`,
  gurkan_sef: `<div style="text-align:center;color:#1E1E1E"><div style="font:400 230px Vibes;line-height:1">Gürkan Şef</div></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2600, height: 900 } });
  const out = path.resolve(__dirname, '../varliklar/kurumsal_logolar'); fs.mkdirSync(out, { recursive: true });
  for (const [ad, html] of Object.entries(L)) {
    const gecici = path.join(F, `_${ad}.html`);
    fs.writeFileSync(gecici, `<html><head><meta charset="utf-8"><style>${FONT}body{margin:0;background:transparent}#l{display:inline-block;padding:40px 80px}</style></head><body><div id="l">${html}</div></body></html>`);
    await p.goto('file://' + gecici, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').length; }).then(n => { if (!n) throw new Error('font yüklenmedi'); });
    await p.locator('#l').screenshot({ path: path.join(out, ad + '.png'), omitBackground: true });
    console.log('tamam', ad);
  }
  await b.close();
})();
