/* Optional towel warmer offer shown under every quote except the 7 × 12 wet wipe (BM21).
 * It is never part of the quote total. Facts come from the approved sales-assistant price list
 * (ek_urunler.ISITICI_RTD23A) and its product notes; no warranty, UV or sterilisation claims. */
(function (root) {
  'use strict';
  const OFFER = Object.freeze({
    model: 'RTD-23A',
    title: 'İsteğe bağlı: Islak havlu ısıtıcı dolap RTD-23A',
    image: 'assets/isitici-rtd23a.jpg',
    priceLine: 'Fiyat: 350 USD + KDV · Kargo: adet başına 350 TL + KDV',
    excluded: 'Yukarıdaki toplam tutara dahil değildir.',
    specs: Object.freeze([
      '60–70 ambalajlı ıslak havlu alır, sürekli yaklaşık 80°C’de sıcak tutar',
      '23 litre · 200 W · 220–230 V, 50/60 Hz',
      'Dış ölçü yaklaşık 45,2 × 28,5 × 35 cm (genişlik × derinlik × yükseklik)',
      'Cam kapak, iki çıkarılabilir paslanmaz tel sepet'
    ]),
    note: 'Görseldeki paketler temsilidir. TL tutarı siparişte teyit edilir.'
  });
  const EXCLUDED_PRODUCTS = Object.freeze(['BM21']);
  function applies(productId) { return typeof productId === 'string' && productId.length > 0 && !EXCLUDED_PRODUCTS.includes(productId); }

  const QUOTE_HEIGHT = 400;
  // Draws the offer box on the quote canvas; returns the height used.
  function drawQuote(c, image, x, y, width) {
    const h = QUOTE_HEIGHT - 40;
    c.save();
    c.fillStyle = '#f4f8fc'; c.fillRect(x - 10, y, width + 20, h);
    c.strokeStyle = '#c6d9ec'; c.lineWidth = 2; c.strokeRect(x - 10, y, width + 20, h);
    const imgW = 380, imgH = Math.min(h - 40, imgW * image.height / image.width);
    c.drawImage(image, x + 10, y + (h - imgH) / 2, imgW, imgH);
    const tx = x + imgW + 40, tw = width - imgW - 50;
    c.textAlign = 'left'; c.fillStyle = '#071e49'; c.font = 'bold 27px Arial'; c.fillText(OFFER.title, tx, y + 50, tw);
    c.fillStyle = '#075dc9'; c.font = 'bold 23px Arial'; c.fillText(OFFER.priceLine, tx, y + 92, tw);
    c.fillStyle = '#9a3412'; c.font = 'bold 21px Arial'; c.fillText(OFFER.excluded, tx, y + 126, tw);
    c.fillStyle = '#334a66'; c.font = '21px Arial';
    let ly = y + 172; for (const line of OFFER.specs) { c.fillText('• ' + line, tx, ly, tw); ly += 36; }
    c.fillStyle = '#647796'; c.font = '18px Arial'; c.fillText(OFFER.note, tx, ly + 8, tw);
    c.restore();
    return QUOTE_HEIGHT;
  }

  function buildBlock(doc) {
    const box = doc.createElement('section'); box.id = 'heaterOffer'; box.hidden = true;
    const img = doc.createElement('img'); img.src = OFFER.image; img.alt = 'Islak havlu ısıtıcı dolap RTD-23A, içinde ambalajlı ıslak havlular'; img.loading = 'lazy'; img.width = 900; img.height = 602;
    const body = doc.createElement('div');
    const h = doc.createElement('h2'); h.textContent = OFFER.title;
    const price = doc.createElement('p'); price.className = 'heaterPrice'; price.textContent = OFFER.priceLine;
    const ex = doc.createElement('p'); ex.className = 'heaterExcluded'; ex.textContent = OFFER.excluded;
    const ul = doc.createElement('ul'); for (const line of OFFER.specs) { const li = doc.createElement('li'); li.textContent = line; ul.append(li); }
    const note = doc.createElement('small'); note.textContent = OFFER.note;
    body.append(h, price, ex, ul, note); box.append(img, body);
    return box;
  }

  function mount(doc) {
    const summary = doc.getElementById('summary');
    if (!summary || doc.getElementById('heaterOffer')) return;
    const box = buildBlock(doc);
    const anchor = doc.getElementById('downloadQuote');
    if (anchor) anchor.before(box); else summary.append(box);
    const sync = () => { const show = !summary.hidden && applies(root.selectedProductId); if (box.hidden === show) box.hidden = !show; };
    new root.MutationObserver(sync).observe(summary, { attributes: true, attributeFilter: ['hidden'] });
    doc.addEventListener('change', sync);
    sync();
  }

  const api = { OFFER, EXCLUDED_PRODUCTS, QUOTE_HEIGHT, applies, drawQuote, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabHeaterOffer = api;
    const start = () => mount(root.document);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
