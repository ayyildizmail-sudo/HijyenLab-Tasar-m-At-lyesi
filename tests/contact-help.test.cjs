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
    before(item) { if (item.id) nodes.set(item.id, item); },
    append(...items) { this.children.push(...items); for (const item of items) if (item.id) nodes.set(item.id, item); },
    getBoundingClientRect() { return { height: 126 }; }
  };
}
const doc = { readyState: 'complete', activeElement: null, body: element('body'), documentElement: element('html'),
  createElement: element, createElementNS: (namespace, tag) => { assert.equal(namespace, 'http://www.w3.org/2000/svg'); return element(tag); }, getElementById: id => nodes.get(id), addEventListener: (name, fn) => { events[name] = fn; } };
nodes.set('pricing', element('section'));
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

// Summary CTA requires a fresh validated snapshot both when opening and when proceeding.
dialog.close();
browser.getHijyenLabSummaryHelpContext = () => null;
assert.equal(browser.HijyenLabContactHelp.openSummaryDraft(), false);
browser.getHijyenLabSummaryHelpContext = () => ({ product: 'Test product', quantity: 5200, fragrance: 'Test scent', customerName: 'PRIVATE', phone: 'PRIVATE', image: 'PRIVATE' });
assert.equal(browser.HijyenLabContactHelp.openSummaryDraft(), true);
assert.equal(draft.value, 'Merhaba, bu tasarımı görüşmek istiyorum.\nÜrün: Test product\nAdet: 5200\nKoku: Test scent');
assert(!draft.value.includes('PRIVATE'));
browser.getHijyenLabSummaryHelpContext = () => null;
let stalePrevented = false; proceed.onclick({ preventDefault() { stalePrevented = true; } });
assert.equal(stalePrevented, true); assert.equal(proceed.href, undefined); assert.equal(nodes.get('contactFreshnessError').hidden, false);
assert.equal(dialog.open, true);
dialog.close(); browser.HijyenLabContactHelp.openDifferentProductDraft('Other product');
assert.equal(nodes.get('contactFreshnessError').hidden, true);
assert.equal(new URL(proceed.href).searchParams.get('text'), draft.value);
console.log('PASS summary draft: fresh validated quote only, product/quantity/fragrance allowlist, stale snapshot prevented on proceed, no upload/PII, other help remains available.');
const unprintedMessage=api.buildMessage({printMode:'unprinted',product:'BM545',quantity:625,phone:'PRIVATE'});
assert.match(unprintedMessage,/Baskısız; klişe uygulanmaz/);assert(!unprintedMessage.includes('PRIVATE'));
dialog.close();
browser.getHijyenLabSummaryHelpContext=()=>({printMode:'unprinted',product:'BM545',quantity:625,fragrance:'Flambau'});
assert.equal(browser.HijyenLabContactHelp.openSummaryDraft(),true);assert.match(nodes.get('contactMessage').value,/baskısız ürün teklifini/);assert.match(nodes.get('contactMessage').value,/Baskısız; klişe uygulanmaz/);
browser.getHijyenLabSummaryHelpContext=()=>({printMode:'printed',product:'BM545',quantity:625,fragrance:'Limon'});let blockedMode=false;nodes.get('contactProceed').onclick({preventDefault(){blockedMode=true;}});assert.equal(blockedMode,true);
console.log('PASS unprinted help: explicit mode, carton quantity context, no PII, and mode-switch freshness guard; no outbound activation.');

// Optional special quote: self-declared group, fresh allowlisted local draft only.
dialog.close();
const special = browser.HijyenLabContactHelp;
assert.equal(special.specialQuoteMessage('verified_customer', contextInput), null);
assert.equal(special.specialQuoteMessage('__proto__', contextInput), null);
let current = { product: 'BM545', printMode: 'unprinted', quantity: 625, fragrance: 'Flambau', customerName:'PRIVATE', phone:'PRIVATE', image:'PRIVATE', price:987654, stage:'PRIVATE' };
browser.getHijyenLabSpecialQuoteContext = () => current;
const group = nodes.get('specialQuoteGroup'), ask = nodes.get('specialQuoteDraft');
assert(group && ask); assert.equal(nodes.get('specialQuoteHelp').tagName, 'DETAILS');
const original = JSON.stringify(current);
group.value = ''; ask.onclick(); assert.equal(nodes.get('specialQuoteError').hidden, false); assert.equal(dialog.open, false);
group.value = 'reseller'; doc.activeElement = ask; ask.onclick();
assert.equal(dialog.open,true); assert.match(draft.value,/Talep grubu \(kendi beyanım\): Satıcı Müşteri/);
assert.match(draft.value,/BM545/); assert.match(draft.value,/Baskısız; klişe uygulanmaz/); assert.match(draft.value,/625/);
assert(!/PRIVATE|987654|farklı bir ürün/.test(draft.value)); assert.equal(JSON.stringify(current),original);
draft.value = 'Düzenlediğim mesaj'; draft.listeners.input();
assert.equal(special.openSpecialQuoteDraft('public_institution'),false,'repeated calls preserve active draft'); assert.equal(draft.value,'Düzenlediğim mesaj');
nodes.get('contactCancel').onclick(); assert.equal(doc.activeElement,ask); assert.equal(group.value,'reseller'); assert.equal(JSON.stringify(current),original);
group.value = 'public_institution'; ask.onclick(); assert.match(draft.value,/Kamu Kurumu/);
current = {...current,product:'BM12',quantity:5200,printMode:'printed',fragrance:'Limon'};
let stale=false; proceed.onclick({preventDefault(){stale=true;}}); assert(stale); assert.equal(proceed.href,undefined);
nodes.get('contactCancel').onclick(); ask.onclick(); assert.match(draft.value,/BM12/); assert.match(draft.value,/5200/); assert(!/BM545|625|Flambau/.test(draft.value));
current = null; stale=false; proceed.onclick({preventDefault(){stale=true;}}); assert(stale,'expired context blocked');
dialog.close(); assert.equal(special.openSpecialQuoteDraft('reseller'),false);
current = { product:'BM15',printMode:'printed',quantity:null,fragrance:'' };
ask.onclick(); assert.match(draft.value,/BM15/); assert(!/adet:|koku:/.test(draft.value));
const beforeCancel=JSON.stringify(current); nodes.get('contactCancel').onclick(); assert.equal(JSON.stringify(current),beforeCancel);
console.log('PASS special quote: self-declaration only, no state mutation, allowlisted message, mode/SKU/quantity freshness, expired guard, editable/cancel/repeated draft, no outbound activation.');

// Another open dialog must be dismissed first; no modal stacking.
doc.querySelector = selector => selector === 'dialog[open]' ? { open: true } : null;
assert.equal(special.openSpecialQuoteDraft('reseller'),false); assert.equal(dialog.open,false);
doc.querySelector = () => null;
assert.equal(special.openSpecialQuoteDraft('reseller'),true); dialog.close();

// Icon-only contact controls retain accessible names and normal interactive semantics.
for (const id of ['contactWhatsApp', 'contactTelephone']) {
  const control = nodes.get(id);
  assert(control.attrs['aria-label']); assert(control.title);
  assert.equal(control.children.length, 1);
  const svg = control.children[0];
  assert.equal(svg.tagName, 'SVG'); assert.equal(svg.attrs['aria-hidden'], 'true');
  assert.equal(svg.attrs.focusable, 'false'); assert.equal(svg.attrs.viewBox, '0 0 24 24');
  assert.equal(svg.children[0].tagName, 'PATH'); assert(svg.children[0].attrs.d);
  assert.equal(control.textContent, undefined);
}
assert(css.includes('width: 48px; height: 48px; min-width: 48px; min-height: 44px; flex: 0 0 48px'));
assert(css.includes('border-radius: 12px'));
assert(!css.includes('border-radius: 50%'));
assert(css.includes(':focus-visible { outline: 3px solid'));
assert(!css.includes('.contactHelpActions { width: 100%'));
console.log('PASS compact contact icons: local decorative SVG, accessible labels/title, fixed iOS rounded-square 48px controls, visible keyboard focus and no stretched mobile boxes.');
// Colour-limit handoff remains an editable local draft and expires after design changes.
if(dialog.open)dialog.close();
let inkPolicy={blocked:true,count:4};browser.currentPrintPolicy=()=>inkPolicy;
browser.getHijyenLabHelpContext=()=>({product:'BM12',stage:'Arka yüz',customerName:'PRIVATE',phone:'PRIVATE',image:'PRIVATE'});
trigger.onclick();assert.match(draft.value,/Tasarımım 4 baskı rengi içeriyor\. Uygun baskı seçeneklerini görüşmek istiyorum\./);assert(!draft.value.includes('PRIVATE'));assert(dialog.open);
inkPolicy={blocked:true,count:5};let staleInk=false;proceed.onclick({preventDefault(){staleInk=true;}});assert(staleInk);assert(!proceed.href);
dialog.close();trigger.onclick();assert.match(draft.value,/Tasarımım 5 baskı rengi/);dialog.close();
inkPolicy={blocked:false,count:3};trigger.onclick();assert(!draft.value.includes('baskı rengi içeriyor'));dialog.close();
for(const bad of [null,-1,0,4.5,Infinity,13,'4'])assert(!api.buildMessage({printInkCount:bad}).includes('baskı rengi içeriyor'));
console.log('PASS colour-limit help includes actual bounded count, excludes PII, waits for customer action and invalidates stale policy context');
inkPolicy={blocked:true,count:null};trigger.onclick();assert.match(draft.value,/üç renk sınırı içinde doğrulanamadı/);assert(!draft.value.includes('0 baskı'));dialog.close();
