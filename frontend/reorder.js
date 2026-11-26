/* Reorder without an account: the quote summary gets an order code and a link. Opening the link shows the
 * same product, scent and last quantity; the customer changes the quantity and sends a WhatsApp message.
 * The link carries no image and no personal data. The design image is kept on this device only when the
 * customer already turned on draft saving. */
(function (root) {
  'use strict';
  const PRODUCTS = ['BM12', 'BM11', 'BM13', 'BM15', 'BM545', 'BM21', 'OSHIBORI'];
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE = /^HL-[A-HJ-NP-Z2-9]{6}$/;
  const PHONE = '905425699869';
  const DB = 'hijyenlab-reorder', STORE = 'designs';
  const clean = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

  function newCode(random = n => root.crypto.getRandomValues(new Uint8Array(n))) {
    return 'HL-' + [...random(6)].map(b => ALPHABET[b % ALPHABET.length]).join('');
  }
  function b64(text) { return root.btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(text) { return decodeURIComponent(escape(root.atob(text.replace(/-/g, '+').replace(/_/g, '/')))); }

  function normalize(o) {
    if (!o || o.v !== 1 || !CODE.test(o.c) || !PRODUCTS.includes(o.p) || !Number.isSafeInteger(o.q) || o.q < 1 || o.q > 1000000 || !['printed', 'unprinted'].includes(o.m)) return null;
    const label = clean(o.l, 140), fragrance = clean(o.f, 140);
    if (!label) return null;
    return { v: 1, c: o.c, p: o.p, l: label, f: fragrance, q: o.q, m: o.m };
  }
  function encode(order) { const n = normalize(order); return n ? b64(JSON.stringify(n)) : null; }
  function decode(token) { try { return normalize(JSON.parse(unb64(String(token)))); } catch { return null; } }
  function linkFor(order, base) { const t = encode(order); return t ? base.split('#')[0] + '#tekrar=' + t : null; }
  function fromHash(hash) { const m = /^#tekrar=([A-Za-z0-9_-]{10,800})$/.exec(hash || ''); return m ? decode(m[1]) : null; }

  function message(order, quantity) {
    return ['Merhaba, tekrar sipariş vermek istiyorum.', 'Sipariş kodu: ' + order.c, 'Ürün: ' + (order.m === 'unprinted' ? 'Baskısız · ' : '') + order.l,
      'Koku: ' + (order.f || 'Belirtilmedi'), 'Adet: ' + quantity.toLocaleString('tr-TR'), 'Önceki adet: ' + order.q.toLocaleString('tr-TR')].join('\n');
  }

  function withStore(mode, fn) {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(Error('no idb'));
      const req = root.indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'code' });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { const db = req.result, tx = db.transaction(STORE, mode), r = fn(tx.objectStore(STORE)); tx.oncomplete = () => { db.close(); resolve(r && r.result); }; tx.onerror = () => { db.close(); reject(tx.error); }; };
    });
  }
  const saveImage = (code, image) => withStore('readwrite', s => s.put({ code, image, at: Date.now() }));
  const loadImage = code => withStore('readonly', s => s.get(code));

  let current = null, currentKey = '';
  function code() { return current ? current.c : null; }

  function mount(doc) {
    const summary = doc.getElementById('summary');
    if (summary && !doc.getElementById('reorderPanel')) {
      const panel = doc.createElement('section'); panel.id = 'reorderPanel'; panel.hidden = true;
      const h = doc.createElement('h2'); h.textContent = 'Tekrar sipariş kodunuz';
      const codeEl = doc.createElement('p'); codeEl.id = 'reorderCode';
      const p = doc.createElement('p'); p.className = 'hint'; p.textContent = 'Bu bağlantıyı saklayın. Aynı ürünü tekrar istediğinizde bağlantıyı açın, sadece adedi yazın.';
      const row = doc.createElement('div'); row.className = 'reorderRow';
      const input = doc.createElement('input'); input.id = 'reorderLink'; input.readOnly = true; input.setAttribute('aria-label', 'Tekrar sipariş bağlantısı');
      const copy = doc.createElement('button'); copy.type = 'button'; copy.className = 'outline'; copy.textContent = 'Bağlantıyı kopyala';
      const done = doc.createElement('small'); done.id = 'reorderCopied'; done.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        try { await root.navigator.clipboard.writeText(input.value); done.textContent = 'Kopyalandı.'; }
        catch { input.select(); done.textContent = 'Bağlantıyı seçtik; uzun basıp kopyalayabilirsiniz.'; }
      });
      row.append(input, copy); panel.append(h, codeEl, p, row, done);
      (doc.getElementById('finalDetails') || summary.firstChild).after(panel);
      const sync = () => {
        let ctx = null; try { ctx = root.getHijyenLabSummaryHelpContext?.(); } catch { ctx = null; }
        const pid = root.selectedProductId;
        if (!ctx || !PRODUCTS.includes(pid)) { if (!panel.hidden) panel.hidden = true; current = null; currentKey = ''; return; }
        const key = JSON.stringify([pid, ctx.product, ctx.fragrance, ctx.quantity, ctx.printMode]);
        if (key !== currentKey) {
          currentKey = key;
          current = normalize({ v: 1, c: newCode(), p: pid, l: ctx.product, f: ctx.fragrance, q: ctx.quantity, m: ctx.printMode || 'printed' });
          if (!current) { panel.hidden = true; return; }
          codeEl.textContent = current.c; input.value = linkFor(current, root.location.href); done.textContent = '';
          const img = doc.getElementById('finalImage')?.src;
          if (doc.getElementById('draftConsent')?.checked && img && img.startsWith('data:image/')) saveImage(current.c, img).catch(() => {});
        }
        if (panel.hidden) panel.hidden = false;
      };
      new root.MutationObserver(sync).observe(summary, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'src'] });
      sync();
    }
    const order = fromHash(root.location.hash);
    if (order && !doc.getElementById('reorderIncoming')) showIncoming(doc, order);
  }

  function showIncoming(doc, order) {
    const main = doc.querySelector('main'); if (!main) return;
    const box = doc.createElement('section'); box.id = 'reorderIncoming';
    const h = doc.createElement('h2'); h.textContent = 'Tekrar sipariş · ' + order.c;
    const figure = doc.createElement('img'); figure.id = 'reorderImage'; figure.alt = 'Önceki tasarımınız'; figure.hidden = true;
    const facts = doc.createElement('p');
    facts.textContent = (order.m === 'unprinted' ? 'Baskısız · ' : '') + order.l + ' · Koku: ' + (order.f || 'Belirtilmedi') + ' · Önceki adet: ' + order.q.toLocaleString('tr-TR');
    const label = doc.createElement('label'); label.textContent = 'Yeni adet';
    const qty = doc.createElement('input'); qty.id = 'reorderQty'; qty.type = 'number'; qty.min = '1'; qty.max = '1000000'; qty.step = '1'; qty.value = String(order.q); qty.inputMode = 'numeric';
    label.append(qty);
    const error = doc.createElement('p'); error.id = 'reorderError'; error.setAttribute('role', 'alert'); error.hidden = true;
    const send = doc.createElement('button'); send.type = 'button'; send.className = 'primary'; send.textContent = 'WhatsApp ile tekrar sipariş ver';
    const note = doc.createElement('small'); note.textContent = 'Ekibimiz sipariş kodunu önceki tasarımınızla eşleştirir. Fiyat ve minimum adet güncel listeye göre teyit edilir.';
    send.addEventListener('click', () => {
      const n = Number(qty.value);
      if (!Number.isSafeInteger(n) || n < 1 || n > 1000000) { error.textContent = 'Geçerli bir adet yazın.'; error.hidden = false; qty.focus(); return; }
      error.hidden = true;
      root.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(message(order, n)), '_blank', 'noopener');
    });
    const other = doc.createElement('button'); other.type = 'button'; other.className = 'linkButton'; other.textContent = 'Yeni tasarım yapmak istiyorum';
    other.addEventListener('click', () => { box.remove(); try { root.history.replaceState(null, '', root.location.pathname + root.location.search); } catch {} });
    box.append(h, figure, facts, label, error, send, note, other);
    const nav = main.querySelector('nav'); if (nav) nav.before(box); else main.prepend(box);
    loadImage(order.c).then(rec => { if (rec && typeof rec.image === 'string' && rec.image.startsWith('data:image/')) { figure.src = rec.image; figure.hidden = false; } }).catch(() => {});
  }

  const api = { newCode, encode, decode, linkFor, fromHash, message, normalize, code, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabReorder = api;
    const start = () => mount(root.document);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
