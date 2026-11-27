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
    delivery: 'Teslim: havlu siparişinizle birlikte, tamamı aynı sevkiyatta gönderilir.',
    note: 'Görseldeki paketler temsilidir. TL tutarı siparişte teyit edilir.'
  });
  const EXCLUDED_PRODUCTS = Object.freeze(['BM21']);
  const MAX_QUANTITY = 20;
  let requested = 0;
  function setRequested(n) { const v = Number.isSafeInteger(n) ? Math.max(0, Math.min(MAX_QUANTITY, n)) : 0; const changed = v !== requested; requested = v; return changed; }
  function requestedQuantity(productId) { return applies(productId) ? requested : 0; }
  // Line added to the customer's WhatsApp message; empty when nothing was requested.
  function requestLine(productId) { const n = requestedQuantity(productId); return n ? '\nEk ürün talebi: Isıtıcı dolap ' + OFFER.model + ' × ' + n + ' adet (350 USD + KDV / adet, teklif toplamına dahil değil; havlularla aynı sevkiyatta)' : ''; }
  function applies(productId) { return typeof productId === 'string' && productId.length > 0 && !EXCLUDED_PRODUCTS.includes(productId); }

  const QUOTE_HEIGHT = 470;
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
    c.fillStyle = '#334a66'; c.fillText('• ' + OFFER.delivery, tx, ly, tw); ly += 36;
    c.fillStyle = '#647796'; c.font = '18px Arial'; c.fillText(OFFER.note, tx, ly + 4, tw);
    if (requested) { c.fillStyle = '#127a46'; c.font = 'bold 22px Arial'; c.fillText('✓ Müşteri talebi: ' + requested + ' adet ısıtıcı dolap (toplama dahil değil)', tx, ly + 40, tw); }
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
    const deliv = doc.createElement('li'); deliv.textContent = OFFER.delivery; ul.append(deliv);
    const note = doc.createElement('small'); note.textContent = OFFER.note;
    const ask = doc.createElement('div'); ask.className = 'heaterAsk';
    const add = doc.createElement('button'); add.type = 'button'; add.id = 'heaterAdd'; add.className = 'primary'; add.textContent = 'Isıtıcıyı da teklife ekle';
    const picked = doc.createElement('div'); picked.className = 'heaterPicked'; picked.hidden = true;
    const label = doc.createElement('label'); label.textContent = 'Adet';
    const qty = doc.createElement('input'); qty.id = 'heaterQty'; qty.type = 'number'; qty.min = '1'; qty.max = String(MAX_QUANTITY); qty.step = '1'; qty.value = '1'; qty.inputMode = 'numeric'; label.append(qty);
    const remove = doc.createElement('button'); remove.type = 'button'; remove.id = 'heaterRemove'; remove.className = 'outline'; remove.textContent = 'Kaldır';
    const said = doc.createElement('p'); said.id = 'heaterStatus'; said.setAttribute('role', 'status');
    picked.append(label, remove); ask.append(add, picked, said);
    body.append(h, price, ex, ul, note, ask); box.append(img, body);
    const refresh = changed => {
      add.hidden = requested > 0; picked.hidden = requested === 0;
      said.textContent = requested ? requested + ' adet ısıtıcı talebiniz WhatsApp mesajınıza ve teklif görseline eklendi. Toplam tutara dahil değildir.' : '';
      if (changed && typeof root.renderQuoteSafely === 'function' && !doc.getElementById('summary')?.hidden) root.renderQuoteSafely();
    };
    add.addEventListener('click', () => { qty.value = '1'; refresh(setRequested(1)); qty.focus(); });
    remove.addEventListener('click', () => refresh(setRequested(0)));
    qty.addEventListener('change', () => { const n = Math.round(Number(qty.value)); const v = Number.isFinite(n) && n >= 1 ? Math.min(MAX_QUANTITY, n) : 1; qty.value = String(v); refresh(setRequested(v)); });
    box.refreshHeater = () => refresh(false);
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

  const api = { OFFER, EXCLUDED_PRODUCTS, QUOTE_HEIGHT, MAX_QUANTITY, applies, drawQuote, mount, setRequested, requestedQuantity, requestLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabHeaterOffer = api;
    const start = () => mount(root.document);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
