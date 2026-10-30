'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('frontend/product-advisor.js', 'utf8');
const sandbox = { module: { exports: {} } }; vm.runInNewContext(source, sandbox);
const A = sandbox.module.exports;
const ids = ['FIXTURE-A', 'FIXTURE-B'];
const choice = (productId = 'FIXTURE-A') => ({ productId, reason: 'Anonymous test reason; not an approved real recommendation.' });
const category = (mapping = {}) => ({ id: 'test-category', label: 'Anonymous category', mapping });
assert.equal(A.DEFAULT_CONFIG.categories.length, 0);
assert(Object.isFrozen(A.DEFAULT_CONFIG.categories));
for (const config of [undefined, null, {}, { categories: [] }, { categories: [category()] }]) assert.equal(A.model(config, ids).enabled, false);
for (const approved of [false, undefined, 'true', 1]) assert.equal(A.model({ categories: [category({ approved, primary: choice() })] }, ids).enabled, false);
for (const primary of [null, choice('UNKNOWN'), { productId: 'FIXTURE-A' }, { productId: 'FIXTURE-A', reason: ' ' }]) assert.equal(A.model({ categories: [category({ approved: true, primary })] }, ids).enabled, false);
const config = { categories: [category({ approved: true, primary: choice(), alternative: choice('FIXTURE-B') }), { id: 'unmapped', label: 'Unmapped anonymous category' }] };
const M = A.model(config, ids);
assert.equal(M.enabled, true); assert.equal(M.canSelect('test-category', 'FIXTURE-A'), true); assert.equal(M.canSelect('test-category', 'FIXTURE-B'), true);
for (const id of ['', 'unmapped', A.UNKNOWN_ID, 'unknown']) assert.equal(M.canSelect(id, 'FIXTURE-A'), false);
assert.equal(M.canSelect('test-category', 'UNKNOWN'), false);
assert(Object.isFrozen(M.categories) && Object.isFrozen(M.categories[0].primary));
assert.equal(A.model({ categories: [category({ approved: true, primary: choice(), alternative: choice() })] }, ids).result('test-category').alternative, null);
assert.equal(A.model({ categories: [category(), category(), { id: A.UNKNOWN_ID, label: 'Invalid reserved category' }, { id: '<script>', label: 'Invalid ID' }] }, ids).categories.length, 1);
// Private research fields are not retained in the public model.
const privateFixture = category({ approved: true, primary: choice() }); privateFixture.customerNames = ['PRIVATE']; privateFixture.count = 123;
assert(!JSON.stringify(A.model({ categories: [privateFixture] }, ids)).includes('PRIVATE'));
assert(!/fetch\(|localStorage|sessionStorage|wa\.me|tel:/.test(source));
// Minimal DOM verifies no product mutation before explicit acceptance, and local help handoff.
const nodes = new Map(); let selected = [], helpOpened = 0;
function el(tag) {
  return { tagName: tag.toUpperCase(), children: [], attrs: {}, listeners: {}, dataset: {},
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, fn) { this.listeners[k] = fn; },
    append(...items) { this.children.push(...items); for (const item of items) if (item.id) nodes.set(item.id, item); },
    replaceChildren(...items) { this.children = []; this.append(...items); },
    focus() { doc.activeElement = this; }, showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); },
    click() { this.onclick?.(); }
  };
}
const host = el('section');
const doc = { body: el('body'), createElement: el, getElementById: id => nodes.get(id), querySelector: () => host };
const help = el('button'); help.onclick = () => { assert.equal(nodes.get('productAdvisorDialog').open, false); helpOpened++; }; nodes.set('contactWhatsApp', help);
const catalog = { items: ids.map(id => ({ id })), get: id => ({ id, label: 'Anonymous product ' + id }) };
const adapters = { document: doc, catalog, selectProduct: id => selected.push(id) };
assert.equal(A.mount(undefined, adapters), false); assert.equal(host.children.length, 0);
assert.equal(A.mount(config, adapters), true); assert.equal(A.mount(config, adapters), false);
const trigger = nodes.get('productAdvisorButton'), dialog = nodes.get('productAdvisorDialog'), select = nodes.get('productAdvisorCategory'), result = nodes.get('productAdvisorResult');
trigger.click(); assert.equal(dialog.open, true); assert.equal(selected.length, 0);
select.value = 'test-category'; select.listeners.change(); assert.equal(result.children.length, 2); assert.equal(selected.length, 0);
nodes.get('productAdvisorCancel').click(); assert.equal(dialog.open, false); assert.equal(doc.activeElement, trigger); assert.equal(selected.length, 0);
trigger.click(); assert.equal(select.value, ''); assert.equal(result.children.length, 0);
select.value = 'test-category'; select.listeners.change(); result.children[0].children[2].click(); assert.deepEqual(selected, ['FIXTURE-A']); assert.equal(dialog.open, false);
trigger.click(); select.value = A.UNKNOWN_ID; select.listeners.change(); nodes.get('productAdvisorHelp').click(); assert.equal(helpOpened, 1); assert.deepEqual(selected, ['FIXTURE-A']);
console.log('PASS advisor: default dormant, explicit approval and catalog guards, anonymous-only fixtures, primary/alternative validation, private fields excluded, optional modal/cancel/reopen, explicit selection only, existing help handoff after dialog closes.');
// Conditional alternatives preserve catalog boundaries; unsupported entries cannot select a SKU.
const inquiryConfig = { categories: [category({ approved: true, primary: choice(), alternatives: [
  { ...choice('FIXTURE-B'), condition: 'Anonymous format preference' },
  { catalogPending: true, label: 'Anonymous not-yet-supported product', condition: 'Anonymous additional preference', reason: 'Anonymous approved test wording only.' },
  { catalogPending: true, productId: 'UNKNOWN', label: 'Must not bypass catalog', condition: 'x', reason: 'x' }
] })] };
const inquiryModel = A.model(inquiryConfig, ids);
assert.equal(inquiryModel.result('test-category').alternatives.length, 2);
assert.equal(inquiryModel.result('test-category').alternatives[1].catalogPending, true);
assert.equal(inquiryModel.canSelect('test-category', undefined), false);
assert.equal(inquiryModel.canSelect('test-category', 'UNKNOWN'), false);
assert.equal(inquiryModel.errors.length, 1);
nodes.delete('productAdvisorButton');
assert.equal(A.mount(inquiryConfig, adapters), false);
inquiryConfig.categories[0].mapping.alternatives.pop();
assert.equal(A.mount(inquiryConfig, adapters), true);
nodes.get('productAdvisorButton').click();
const inquirySelect = nodes.get('productAdvisorCategory'); inquirySelect.value = 'test-category'; inquirySelect.listeners.change();
const inquiryCard = nodes.get('productAdvisorResult').children[2];
assert.equal(inquiryCard.children[3].dataset.advisorPending, 'true');
assert.equal(inquiryCard.children[3].disabled, true);
assert.equal(inquiryCard.children[3].textContent, 'Tasarım seçeneği hazırlanıyor');
assert.equal(inquiryCard.children[3].onclick, undefined);
assert.equal(inquiryCard.children[3].dataset.advisorProduct, undefined);
inquiryCard.children[3].click(); assert.equal(helpOpened, 1); assert.deepEqual(selected, ['FIXTURE-A']);
console.log('PASS conditional alternatives: multiple preference branches, unknown SKU rejected, unsupported products remain descriptive and disabled without contact routing or product selection.');

// A neutral all-products category has no fabricated primary winner.
const neutralConfig = { categories: [category({ approved: true, choices: [choice(), choice('FIXTURE-B')] })] };
const neutral = A.model(neutralConfig, ids);
assert.equal(neutral.enabled, true); assert.equal(neutral.result('test-category').primary, null);
assert.equal(neutral.canSelect('test-category', 'FIXTURE-B'), true);
nodes.delete('productAdvisorButton'); assert.equal(A.mount(neutralConfig, adapters), true);
nodes.get('productAdvisorButton').click(); nodes.get('productAdvisorCategory').value = 'test-category'; nodes.get('productAdvisorCategory').listeners.change();
assert(nodes.get('productAdvisorResult').children.every(card => card.children[0].textContent.startsWith('Seçenek:')));
console.log('PASS neutral category: all allowed products selectable, no invented recommended winner; invalid approved configuration exposes errors and refuses to mount.');

assert.equal(A.model({ categories: [{ id: '<bad>', label: 'Test', mapping: { approved: true, primary: choice() } }] }, ids).errors.length, 1);
assert.equal(A.model({ categories: [category({ approved: true, choices: [null] })] }, ids).errors.length, 1);
console.log('PASS pending-product guard: no WhatsApp route, no selection handler, disabled honest status; malformed approved config observable.');
let requestedDescription = null;
sandbox.HijyenLabContactHelp = { openDifferentProductDraft(description) { assert.equal(nodes.get('productAdvisorDialog').open, false); requestedDescription = description; return true; } };
nodes.get('productAdvisorDifferent').click(); assert.equal(nodes.get('productAdvisorDifferentFields').hidden, false);
nodes.get('productAdvisorRequest').value = 'An anonymous different product';
nodes.get('productAdvisorPrepareMessage').click();
assert.equal(requestedDescription, 'An anonymous different product');
assert.deepEqual(selected, ['FIXTURE-A']);
nodes.get('productAdvisorButton').click(); assert.equal(nodes.get('productAdvisorRequest').value, 'An anonymous different product');
console.log('PASS distinct different-product request: optional short field, explicit local draft handoff only after advisor closes, text preserved on return, no product mutation.');
