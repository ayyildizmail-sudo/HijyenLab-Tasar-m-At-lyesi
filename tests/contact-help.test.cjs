'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('frontend/contact-help.js', 'utf8');
const css = fs.readFileSync('frontend/contact-help.css', 'utf8');
const context = { module: { exports: {} } };
vm.runInNewContext(source, context);
const api = context.module.exports;
assert.equal(api.CONTACT.international, '+905425699869');
assert.equal(api.links.telephone, 'tel:+905425699869');
const url = new URL(api.links.whatsapp);
assert.equal(url.origin, 'https://wa.me');
assert.equal(url.pathname, '/905425699869');
assert.equal(url.searchParams.get('text'), api.CONTACT.message);
assert.equal([...url.searchParams].length, 1);
assert(Object.isFrozen(api) && Object.isFrozen(api.CONTACT) && Object.isFrozen(api.links));
assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|window\.open|\.click\(/.test(source));
assert(source.includes("proceed.target = '_blank'") && source.includes("proceed.rel = 'noopener noreferrer'"));
assert(source.includes("doc.getElementById('contactHelp')"));
assert(css.includes('min-height: 44px'));
assert(css.includes('env(safe-area-inset-bottom)'));
assert(css.includes('scroll-padding-bottom') && css.includes('scroll-margin-bottom'));
assert(css.includes('body.contactHelpEditing #contactHelp { position: static; }'));
assert(css.includes('(max-height: 500px)'));
console.log('PASS contact help: exact normalized number, encoded generic-only message, immutable configuration, no automatic send/data read, new-tab protection, touch/safe-area/keyboard CSS guards. Browser layout remains separate QA.');
// Execute mounting and field-focus behavior without opening either external link.
const nodes = new Map(), events = {}, bodyClasses = new Set();
function element(tag) {
  return { tagName: tag.toUpperCase(), children: [], attrs: {}, listeners: {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
    removeAttribute(name) { delete this[name]; delete this.attrs[name]; },
    focus() { doc.activeElement = this; }, showModal() { this.open = true; },
    close() { this.open = false; this.listeners.close?.(); }, style: { setProperty() {} },
    classList: { add(x) { bodyClasses.add(x); }, toggle(x, on) { on ? bodyClasses.add(x) : bodyClasses.delete(x); } },
    setAttribute(k, v) { this.attrs[k] = v; },
    append(...items) { this.children.push(...items); for (const item of items) if (item.id) nodes.set(item.id, item); },
    getBoundingClientRect() { return { height: 126 }; }
  };
}
const doc = { readyState: 'complete', activeElement: null, body: element('body'), documentElement: element('html'),
  createElement: element, getElementById: id => nodes.get(id), addEventListener: (name, fn) => { events[name] = fn; } };
const browser = { document: doc, addEventListener() {}, setTimeout(fn) { fn(); } };
vm.runInNewContext(source, { window: browser });
assert.equal(doc.body.children.length, 2);
assert.equal(nodes.get('contactWhatsApp').tagName, 'BUTTON');
assert.equal(nodes.get('contactWhatsApp').href, undefined);
assert.equal(nodes.get('contactTelephone').href, api.links.telephone);
assert.equal(nodes.get('contactHelp').attrs['aria-label'], 'HijyenLab ile iletişim');
browser.HijyenLabContactHelp.mount(doc);
assert.equal(doc.body.children.length, 2);
doc.activeElement = element('input'); events.focusin(); assert(bodyClasses.has('contactHelpEditing'));
doc.activeElement = nodes.get('contactWhatsApp'); events.focusout(); assert(!bodyClasses.has('contactHelpEditing'));
console.log('PASS contact help DOM: mount once, correct accessible links, no outbound activation, keyboard-focus unfix/reset.');

assert.equal(api.buildMessage(), api.CONTACT.message);
const contextInput = { product: 'BM12', stage: 'Arka yüz', quantity: 5200, fragrance: 'Limon', customerName: 'SECRET NAME', phone: 'SECRET PHONE', address: 'SECRET ADDRESS', price: 12345, image: 'SECRET IMAGE' };
const message = api.buildMessage(contextInput);
assert(message.includes('Ürün: BM12') && message.includes('Bulunduğum aşama: Arka yüz') && message.includes('Seçtiğim adet: 5200') && message.includes('Seçtiğim koku: Limon'));
assert(!/SECRET|12345/.test(message));
for (const quantity of [null, undefined, 0, -1, 2.5, NaN, Infinity, '5200', 1000001]) assert(!api.buildMessage({ quantity }).includes('adet'));
assert.equal(new URL(api.messageLink('Merhaba & ? # + ç')).searchParams.get('text'), 'Merhaba & ? # + ç');
browser.getHijyenLabHelpContext = () => contextInput;
const trigger = nodes.get('contactWhatsApp'), dialog = nodes.get('contactHelpDialog'), draft = nodes.get('contactMessage'), proceed = nodes.get('contactProceed');
trigger.onclick();
assert.equal(dialog.open, true); assert.equal(draft.value, message); assert.equal(doc.activeElement.id, 'contactHelpTitle');
assert.equal(new URL(proceed.href).searchParams.get('text'), message);
draft.value = 'Kendi mesajım'; draft.listeners.input();
assert.equal(new URL(proceed.href).searchParams.get('text'), 'Kendi mesajım');
nodes.get('contactCancel').onclick(); assert.equal(dialog.open, false); assert.equal(doc.activeElement, trigger);
contextInput.stage = 'Koku seçimi'; trigger.onclick(); assert(draft.value.includes('Koku seçimi')); assert(!draft.value.includes('Kendi mesajım'));
draft.value = ' '; draft.listeners.input(); assert.equal(proceed.href, undefined);
let prevented = false; proceed.onclick({ preventDefault() { prevented = true; } }); assert(prevented); assert.equal(dialog.open, true);
dialog.close(); assert.equal(doc.activeElement, trigger);
browser.getHijyenLabHelpContext = () => { throw new Error('Unavailable'); }; trigger.onclick(); assert.equal(draft.value, api.CONTACT.message);
console.log('PASS editable draft: context allowlist, valid quantity, encoding, local preview, edit/cancel/reopen, snapshot refresh, empty-message guard, focus restoration and generic fallback. No outbound link activated.');
// Narrow explicit different-product request never serializes or merges the old design.
assert.equal(api.differentProductMessage({ customerName: 'SECRET' }), 'Merhaba, ürün seçimi konusunda yardım almak istiyorum.');
assert.equal(api.differentProductMessage('x'.repeat(500)).split('İstediğim ürün: ')[1].length, 300);
browser.getHijyenLabHelpContext = () => ({ product: 'OLD PRODUCT', quantity: 5200, fragrance: 'OLD FRAGRANCE' });
dialog.close();
assert.equal(browser.HijyenLabContactHelp.openDifferentProductDraft('Farklı ölçü & ambalaj'), true);
assert.equal(draft.value, 'Merhaba, önerilen ürünlerden farklı bir ürün arıyorum. İstediğim ürün: Farklı ölçü & ambalaj');
assert(!/OLD|5200/.test(draft.value));
assert.equal(new URL(proceed.href).searchParams.get('text'), draft.value);
nodes.get('contactCancel').onclick(); assert.equal(dialog.open, false);
browser.HijyenLabContactHelp.openDifferentProductDraft(''); assert.equal(draft.value, 'Merhaba, ürün seçimi konusunda yardım almak istiyorum.');
console.log('PASS different-product draft: explicit bounded string only, no stale selected SKU/quantity/fragrance, empty generic request, editable local preview and cancel; no outbound activation.');
