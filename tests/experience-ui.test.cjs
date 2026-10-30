'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('frontend/experience-ui.js', 'utf8');
const ctx = { module: { exports: {} } }; vm.runInNewContext(source, ctx); const E = ctx.module.exports;
for (const visible of [[], ['design'], ['rearPreview'], ['pdfPicker'], ['photoEditor'], ['whiteCarrierPanel']]) assert.equal(E.stepFromPanels(id => visible.includes(id)), 'design');
assert.equal(E.stepFromPanels(id => id === 'fragrancePanel'), 'fragrance');
for (const panel of ['summary', 'pricing']) assert.equal(E.stepFromPanels(id => id === panel), 'quote');
for (const text of ['Dosya en fazla 8 MB olmalı.', 'Dosya boş veya 8 MB sınırını aşıyor.', 'Görsel boyutları bu cihaz önizlemesi için çok büyük veya geçersiz.', 'JPEG başlığı geçersiz.', 'WebP dosyası eksik.', 'Bu görselden temiz logo ayrılamadı. Fotoğrafı teklifin içine koymuyoruz. Temiz logo dosyasını ayrıca yükleyin.', 'PDF sayfası açılamadı: test']) {
  const error = E.uploadFailure(text); assert(error); assert.equal(error.raw, text); assert(error.short.length < 120);
}
const unsupported = 'Bu cihaz demosu HEIC/HEIF ve TIFF dosyalarını açamıyor. PNG, JPG veya PDF olarak dışa aktarın.';
assert(E.onStatus(unsupported).includes('HEIC/HEIF ve TIFF'));
for (const message of ['Logo yüklendi.', 'Yeni görsel işleniyor; eski tasarımın teklifi kullanılmaz.', 'QR kod için menü veya bağlantı adresini yazın.', 'Geçerli bir telefon numarası yazın.', 'Teklif önizlemeniz hazır.']) { assert.equal(E.uploadFailure(message), null); assert.equal(E.onStatus(message), message); }
assert(!/fetch\(|localStorage|sessionStorage|navigator\.share|wa\.me/.test(source));
// DOM checks: only UI metadata changes; no design, lead or uploaded file data is read/written.
const nodes = new Map(), events = {}; let fileOpens = 0, helpOpens = 0, discussionOpens = 0, observer;
function el(tag) {
  return { tagName: tag.toUpperCase(), children: [], attrs: {}, dataset: {}, listeners: {}, hidden: false,
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
    append(...items) { this.children.push(...items); for (const item of items) if (item.id) nodes.set(item.id, item); },
    before(item) { if (item.id) nodes.set(item.id, item); }, after(item) { if (item.id) nodes.set(item.id, item); }, prepend(item) { this.append(item); },
    click() { this.onclick?.(); }, querySelector(selector) { return selector === 'header' ? header : null; }
  };
}
const main = el('main'), header = el('header');
for (const id of ['summary', 'pricing', 'fragrancePanel', 'design', 'rearPreview', 'status', 'summaryBack', 'unifiedUpload', 'contactWhatsApp']) { const item = el('div'); item.id = id; item.hidden = true; nodes.set(id, item); }
nodes.get('design').hidden = false;
nodes.get('unifiedUpload').onclick = () => fileOpens++;
nodes.get('contactWhatsApp').onclick = () => helpOpens++;
const doc = { readyState: 'complete', createElement: el, getElementById: id => nodes.get(id), querySelector: () => main, addEventListener(name, fn) { events[name] = fn; } };
let validQuote = false;
const browser = { document: doc, MutationObserver: class { constructor(fn) { observer = fn; } observe() {} }, getHijyenLabSummaryHelpContext: () => validQuote ? { product: 'X', quantity: 1, fragrance: 'Y' } : null,
 HijyenLabContactHelp: { openSummaryDraft() { discussionOpens++; return validQuote; } } };
vm.runInNewContext(source, { window: browser });
const progress = nodes.get('journeyProgress'), items = progress.children[0].children;
assert.equal(items.filter(item => item.attrs['aria-current'] === 'step').length, 1);
assert.equal(items[0].attrs['aria-current'], 'step');
nodes.get('design').hidden = true; nodes.get('rearPreview').hidden = false; observer(); assert.equal(items[0].attrs['aria-current'], 'step');
nodes.get('rearPreview').hidden = true; nodes.get('fragrancePanel').hidden = false; observer(); assert.equal(items[1].attrs['aria-current'], 'step');
nodes.get('fragrancePanel').hidden = true; nodes.get('summary').hidden = false; validQuote = true; observer(); assert.equal(items[2].attrs['aria-current'], 'step'); assert.equal(nodes.get('discussDesign').disabled, false);
nodes.get('discussDesign').click(); assert.equal(discussionOpens, 1); assert.equal(nodes.get('summaryDiscussionError').hidden, true);
validQuote = false; events.change(); assert.equal(nodes.get('discussDesign').disabled, true);
const api = browser.HijyenLabExperience;
api.onStatus(unsupported); assert.equal(nodes.get('uploadRecovery').hidden, false); assert.equal(nodes.get('uploadRecoveryOriginal').textContent, unsupported);
nodes.get('uploadRecoveryChange').click(); nodes.get('uploadRecoveryHelp').click(); assert.equal(fileOpens, 1); assert.equal(helpOpens, 1);
api.onStatus('Görsel yüklendi.'); assert.equal(nodes.get('uploadRecovery').hidden, true);
console.log('PASS experience UI: truthful 3-step current marker, rear stays design, fresh-only summary CTA, local help/download instruction, short actionable upload errors with original detail, recovery actions without form mutation.');
